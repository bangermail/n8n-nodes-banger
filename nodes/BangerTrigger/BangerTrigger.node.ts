import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { bangerApiRequest, getWorkspaceId } from '../Banger/GenericFunctions';

// Banger signs each delivery: base64url(HMAC-SHA256(secret, `${timestamp}.${body}`)),
// sent as `banger-webhook-signature: v1,<signature>`. Retries are signed again
// with a fresh timestamp, so a five-minute window only rejects replays.
const SIGNATURE_TOLERANCE_SECONDS = 300;

function expectedSignature(secret: string, timestamp: string, body: string): string {
	return createHmac('sha256', secret)
		.update(`${timestamp}.${body}`)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function signatureMatches(expected: string, header: string): boolean {
	return header
		.split(' ')
		.map((part) => part.trim())
		.filter((part) => part.startsWith('v1,'))
		.some((part) => {
			const given = Buffer.from(part.slice(3).replace(/=+$/, ''));
			const wanted = Buffer.from(expected);
			return given.length === wanted.length && timingSafeEqual(given, wanted);
		});
}

export class BangerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Banger Trigger',
		name: 'bangerTrigger',
		icon: { light: 'file:../../icons/banger.svg', dark: 'file:../../icons/banger.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something changes in Banger',
		defaults: {
			name: 'Banger Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'bangerApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Banger sends a short notice that something changed, with the IDs involved. Add a Banger node after this trigger to read the details.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['mail.changed'],
				options: [
					{
						name: 'Approval Activity',
						value: 'approval.changed',
						description: 'An approval request in Approvals changes',
					},
					{
						name: 'Broadcast Activity',
						value: 'campaign.changed',
						description: 'A Broadcast changes',
					},
					{
						name: 'Customer Activity',
						value: 'audience.changed',
						description: 'Contact or audience data changes',
					},
					{
						name: 'Domain Activity',
						value: 'domain.changed',
						description: 'A sending domain changes',
					},
					{
						name: 'Mailbox Activity',
						value: 'mail.changed',
						description:
							'A mailbox, thread, message, draft, or work item changes, including new inbound email',
					},
					{
						name: 'Mailbox Sending Paused',
						value: 'sending.mailbox_paused',
						description: "Banger paused one mailbox's sending after a burst of spam complaints",
					},
					{
						name: 'Rule Activity',
						value: 'automation.changed',
						description: 'Banger publishes an update to its automation rules',
					},
					{
						name: 'Sender Reputation Warning',
						value: 'sending.warning',
						description:
							'A sending lane crossed the bounce or complaint warning level. Nothing is paused.',
					},
					{
						name: 'Sending Activity',
						value: 'send.changed',
						description:
							'Sending or deliverability activity changes. Check Logs for the delivery status.',
					},
					{
						name: 'Sending Domain Paused',
						value: 'sending.domain_paused',
						description:
							'Banger paused every lane and mailbox of a domain for sender-reputation safety',
					},
					{
						name: 'Sending Lane Paused',
						value: 'sending.lane_paused',
						description:
							'Banger paused one sending lane of a domain for its bounce or complaint rate',
					},
					{
						name: 'Sending Resumed',
						value: 'sending.resumed',
						description: 'A sending pause or freeze was released',
					},
					{
						name: 'Workspace Sending Frozen',
						value: 'sending.workspace_frozen',
						description: 'Banger froze all sending in the workspace until it reviews it',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;
				const workspaceId = await getWorkspaceId.call(this);
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/webhooks`,
				);
				const webhookUrl = this.getNodeWebhookUrl('default');
				const exists = ((response.data as IDataObject[] | undefined) ?? []).some(
					(webhook) =>
						webhook.id === staticData.webhookId &&
						webhook.status === 'active' &&
						webhook.endpoint_url === webhookUrl,
				);
				if (!exists) {
					delete staticData.webhookId;
					delete staticData.signingSecret;
				}
				return exists;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const workspaceId = await getWorkspaceId.call(this);
				const workflowName = this.getWorkflow().name ?? this.getWorkflow().id ?? 'workflow';
				const response = await bangerApiRequest.call(
					this,
					'POST',
					`/v1/workspaces/${workspaceId}/webhooks`,
					{
						kind: 'outbound',
						name: `n8n: ${workflowName}`.slice(0, 120),
						endpoint_url: this.getNodeWebhookUrl('default'),
						event_types: this.getNodeParameter('events') as string[],
					},
				);
				const webhook = (response.data ?? {}) as IDataObject;
				if (!webhook.id || !webhook.signing_secret) return false;
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = webhook.id;
				staticData.signingSecret = webhook.signing_secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.webhookId) {
					const workspaceId = await getWorkspaceId.call(this);
					try {
						await bangerApiRequest.call(
							this,
							'DELETE',
							`/v1/workspaces/${workspaceId}/webhooks/${staticData.webhookId as string}`,
						);
					} catch (error) {
						this.logger.warn(
							`Banger Trigger could not remove webhook ${staticData.webhookId as string}: ${(error as Error).message}`,
						);
						return false;
					}
				}
				delete staticData.webhookId;
				delete staticData.signingSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const staticData = this.getWorkflowStaticData('node');
		const secret = staticData.signingSecret as string | undefined;
		const timestamp = String(request.headers['banger-webhook-timestamp'] ?? '');
		const signature = String(request.headers['banger-webhook-signature'] ?? '');
		const rawBody = request.rawBody?.toString('utf8') ?? JSON.stringify(request.body);
		const age = Math.abs(Date.now() / 1000 - Number(timestamp));

		if (
			!secret ||
			!timestamp ||
			!(age <= SIGNATURE_TOLERANCE_SECONDS) ||
			!signatureMatches(expectedSignature(secret, timestamp, rawBody), signature)
		) {
			const response = this.getResponseObject();
			response.status(401).json({ error: 'invalid_signature' });
			return { noWebhookResponse: true };
		}

		const event = this.getBodyData();
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					...event,
					delivery_id: request.headers['banger-webhook-id'],
				}),
			],
		};
	}
}
