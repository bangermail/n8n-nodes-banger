import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BANGER_API_URL = 'https://api.bangermail.com';

type BangerContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

interface BangerErrorBody {
	error?: { code?: string; message?: string; request_id?: string };
	name?: string;
	message?: string;
}

// Banger answers with {"error":{"code","message"}} on /v1 routes and with the
// Resend shape {"name","message"} on /emails. Surface the code and message
// either way so the n8n error panel says what Banger said.
function bangerErrorBody(error: JsonObject): BangerErrorBody | undefined {
	const response = error.response as IDataObject | undefined;
	const context = error.context as IDataObject | undefined;
	const body = (context?.data ?? response?.data ?? response?.body ?? error.error) as
		| BangerErrorBody
		| string
		| undefined;
	if (typeof body !== 'string') return body;
	try {
		return JSON.parse(body) as BangerErrorBody;
	} catch {
		return undefined;
	}
}

function describeBangerError(error: JsonObject): { message?: string; description?: string } {
	const parsed = bangerErrorBody(error);
	const code = parsed?.error?.code ?? parsed?.name;
	const message = parsed?.error?.message ?? parsed?.message;
	const hint = code ? ERROR_HINTS[code] : undefined;
	if (hint) return hint;
	if (!code && !message) return {};
	return {
		message: message ?? code,
		description: code ? `Banger code: ${code}` : undefined,
	};
}

const ERROR_HINTS: Record<string, { message: string; description: string }> = {
	unauthorized: {
		message: 'Banger did not recognise the API key',
		description:
			'Check the Banger credential. A Banger API key starts with bgr_ and is shown once when you create it under API keys.',
	},
	invalid_api_key: {
		message: 'The Banger API key is invalid, expired, or revoked',
		description: 'Create a new key under API keys in Banger and update the Banger credential.',
	},
	product_required: {
		message: 'This workspace has more than one product',
		description:
			"Use an API key made for one product, or set 'Product' under 'Additional Fields'.",
	},
	api_key_product_mismatch: {
		message: 'This API key belongs to another product',
		description: "Leave 'Product' empty: a product's API key always works in its own product.",
	},
	webhook_name_taken: {
		message: 'Another Banger webhook already has this name',
		description:
			"The trigger names its webhook after the workflow. Rename the workflow, or delete the other webhook on Banger's Webhooks page.",
	},
	product_reply_to_required: {
		message: 'Product email needs exactly one Reply To address',
		description: "Set 'Reply To' to the one address that should receive replies.",
	},
};

/** Banger's error code for a failed request, such as webhook_name_taken. */
export function bangerErrorCode(error: unknown): string | undefined {
	return (error as { bangerCode?: string } | undefined)?.bangerCode;
}

export async function bangerApiRequest(
	this: BangerContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
	headers?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BANGER_API_URL}${path}`,
		json: true,
		headers: { Accept: 'application/json', ...(headers ?? {}) },
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;
	try {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'bangerApi',
			options,
		)) as IDataObject | undefined;
		return response ?? {};
	} catch (error) {
		// n8n's request helper already throws a NodeApiError, and wrapping one
		// returns it unchanged, so put Banger's own words on it directly.
		const details = describeBangerError(error as JsonObject);
		const parsed = bangerErrorBody(error as JsonObject);
		if (error instanceof NodeApiError) {
			if (details.message) error.message = details.message;
			if (details.description) error.description = details.description;
		}
		const apiError = new NodeApiError(this.getNode(), error as JsonObject, details);
		Object.assign(apiError, { bangerCode: parsed?.error?.code ?? parsed?.name });
		throw apiError;
	}
}

// An API key belongs to exactly one workspace. /v1/bootstrap names it, and every
// other route lives under /v1/workspaces/{workspaceId}.
export async function getWorkspaceId(this: BangerContext): Promise<string> {
	const response = await bangerApiRequest.call(this, 'GET', '/v1/bootstrap');
	const data = (response.data ?? {}) as IDataObject;
	const workspaceId = data.selected_workspace_id as string | undefined;
	if (!workspaceId) {
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message: 'Banger did not return a workspace for this API key',
			description: 'Check that the API key in the Banger credential is active.',
		});
	}
	return workspaceId;
}

// Banger replays a write when it sees the same Idempotency-Key with the same
// payload, so a node retry inside one execution never sends or enrolls twice.
// The run index keeps loop iterations apart. Keys are 16 to 128 characters,
// which every Banger route accepts.
export function idempotencyKey(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	override?: string,
): string {
	if (override) return override;
	const executionId = this.getExecutionId() || `local${Date.now().toString(36)}`;
	const runIndex = Number(this.getWorkflowDataProxy(itemIndex).$runIndex ?? 0);
	const key = `n8n-${executionId}-${this.getNode().id}-${operation}-${runIndex}-${itemIndex}`;
	return key
		.replace(/[^A-Za-z0-9._:-]/g, '-')
		.slice(0, 128)
		.padEnd(16, '0');
}
