import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { contactFields, contactOperations } from './descriptions/ContactDescription';
import { emailFields, emailOperations } from './descriptions/EmailDescription';
import { journeyFields, journeyOperations } from './descriptions/JourneyDescription';
import { workspaceOperations } from './descriptions/WorkspaceDescription';
import { bangerApiRequest, getWorkspaceId, idempotencyKey } from './GenericFunctions';

interface NameValue {
	name?: string;
	value?: string;
}

function addressList(value: string): string[] {
	return value
		.split(',')
		.map((address) => address.trim())
		.filter((address) => address.length > 0);
}

function nameValuePairs(collection: IDataObject | undefined, key: string): NameValue[] {
	return ((collection?.[key] as NameValue[] | undefined) ?? []).filter((pair) => pair.name);
}

function nameValueObject(pairs: NameValue[]): IDataObject {
	const result: IDataObject = {};
	for (const pair of pairs) result[pair.name as string] = pair.value ?? '';
	return result;
}

function resourceLocatorValue(
	this: IExecuteFunctions,
	name: string,
	itemIndex: number,
): { mode: string; value: string } {
	const locator = this.getNodeParameter(name, itemIndex) as { mode: string; value: string };
	return { mode: locator.mode, value: String(locator.value ?? '').trim() };
}

async function resolveContactId(
	this: IExecuteFunctions,
	workspacePath: string,
	itemIndex: number,
): Promise<string> {
	const { mode, value } = resourceLocatorValue.call(this, 'contact', itemIndex);
	if (!value) {
		throw new NodeOperationError(this.getNode(), "The 'Contact' parameter is empty", {
			itemIndex,
			description: 'Choose a contact, or enter its email or ID.',
		});
	}
	if (mode !== 'email') return value;
	const contact = await findContactByEmail.call(this, workspacePath, value);
	if (!contact) {
		throw new NodeOperationError(
			this.getNode(),
			`No contact with the email ${value} [item ${itemIndex}]`,
			{
				itemIndex,
				description: "Add the contact first with the 'Create or Update' operation.",
			},
		);
	}
	return contact.id as string;
}

async function findContactByEmail(
	this: IExecuteFunctions,
	workspacePath: string,
	email: string,
): Promise<IDataObject | undefined> {
	const wanted = email.toLowerCase();
	const response = await bangerApiRequest.call(
		this,
		'GET',
		`${workspacePath}/contacts`,
		undefined,
		{
			q: email,
			limit: 100,
		},
	);
	return ((response.data as IDataObject[] | undefined) ?? []).find(
		(contact) => String(contact.email).toLowerCase() === wanted,
	);
}

export class Banger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Banger',
		name: 'banger',
		icon: { light: 'file:../../icons/banger.svg', dark: 'file:../../icons/banger.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send Product email, manage contacts and run Journeys with Banger',
		defaults: {
			name: 'Banger',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'bangerApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Email', value: 'email' },
					{ name: 'Journey', value: 'journey' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'email',
			},
			...emailOperations,
			...emailFields,
			...contactOperations,
			...contactFields,
			...journeyOperations,
			...journeyFields,
			...workspaceOperations,
		],
	};

	methods = {
		loadOptions: {
			async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = await getWorkspaceId.call(this);
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/products`,
				);
				return ((response.data as IDataObject[] | undefined) ?? [])
					.filter((product) => product.status === 'active')
					.map((product) => ({ name: product.name as string, value: product.id as string }));
			},

			async getMailboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = await getWorkspaceId.call(this);
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/mailboxes`,
				);
				return ((response.data as IDataObject[] | undefined) ?? []).map((mailbox) => ({
					name: (mailbox.address as string) || (mailbox.display_name as string),
					value: mailbox.id as string,
				}));
			},
		},

		listSearch: {
			async searchContacts(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const workspaceId = await getWorkspaceId.call(this);
				const qs: IDataObject = { limit: 50 };
				if (filter) qs.q = filter;
				if (paginationToken) qs.cursor = paginationToken;
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/contacts`,
					undefined,
					qs,
				);
				const page = (response.page ?? {}) as IDataObject;
				return {
					results: ((response.data as IDataObject[] | undefined) ?? []).map((contact) => ({
						name: contact.display_name
							? `${contact.display_name as string} (${contact.email as string})`
							: (contact.email as string),
						value: contact.id as string,
					})),
					paginationToken: page.has_more ? (page.next_cursor as string) : undefined,
				};
			},

			async searchContactLists(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const workspaceId = await getWorkspaceId.call(this);
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/contact-lists`,
				);
				const wanted = (filter ?? '').toLowerCase();
				return {
					results: ((response.data as IDataObject[] | undefined) ?? [])
						.filter((list) => !wanted || String(list.name).toLowerCase().includes(wanted))
						.map((list) => ({ name: list.name as string, value: list.id as string })),
				};
			},

			async searchJourneys(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const workspaceId = await getWorkspaceId.call(this);
				const qs: IDataObject = {};
				if (filter) qs.q = filter;
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/journeys`,
					undefined,
					qs,
				);
				return {
					results: ((response.data as IDataObject[] | undefined) ?? [])
						.filter((journey) => journey.status !== 'archived')
						.map((journey) => ({ name: journey.name as string, value: journey.id as string })),
				};
			},

			async searchApiJourneys(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const workspaceId = await getWorkspaceId.call(this);
				const qs: IDataObject = { trigger_kind: 'api' };
				if (filter) qs.q = filter;
				const response = await bangerApiRequest.call(
					this,
					'GET',
					`/v1/workspaces/${workspaceId}/journeys`,
					undefined,
					qs,
				);
				return {
					results: ((response.data as IDataObject[] | undefined) ?? [])
						.filter((journey) => journey.api_key && journey.status !== 'archived')
						.map((journey) => ({
							name: `${journey.name as string} (${journey.api_key as string})`,
							value: journey.api_key as string,
						})),
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let workspaceId: string | undefined;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				workspaceId ??= await getWorkspaceId.call(this);
				const workspacePath = `/v1/workspaces/${workspaceId}`;
				let result: IDataObject | IDataObject[] = {};

				if (resource === 'email' && operation === 'send') {
					const format = this.getNodeParameter('emailFormat', i) as string;
					const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						from: this.getNodeParameter('from', i) as string,
						to: addressList(this.getNodeParameter('to', i) as string),
						subject: this.getNodeParameter('subject', i) as string,
						reply_to: (this.getNodeParameter('replyTo', i) as string).trim(),
					};
					if (format !== 'text') body.html = this.getNodeParameter('html', i) as string;
					if (format !== 'html') body.text = this.getNodeParameter('text', i) as string;
					if (additional.cc) body.cc = addressList(additional.cc as string);
					if (additional.bcc) body.bcc = addressList(additional.bcc as string);
					const tags = nameValuePairs(additional.tags as IDataObject, 'tag');
					if (tags.length) body.tags = tags;
					const headers = nameValuePairs(additional.headers as IDataObject, 'header');
					if (headers.length) body.headers = nameValueObject(headers);

					const requestHeaders: IDataObject = {
						'Idempotency-Key': idempotencyKey.call(
							this,
							'email-send',
							i,
							additional.idempotencyKey as string,
						),
					};
					if (additional.productId) requestHeaders['x-banger-product-id'] = additional.productId;
					result = await bangerApiRequest.call(
						this,
						'POST',
						'/emails',
						body,
						undefined,
						requestHeaders,
					);
				} else if (resource === 'contact' && operation === 'upsert') {
					const status = this.getNodeParameter('status', i) as string;
					const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
					const consentConfirmed =
						status === 'subscribed' && (this.getNodeParameter('consentConfirmed', i) as boolean);
					if (status === 'subscribed' && !consentConfirmed) {
						throw new NodeOperationError(
							this.getNode(),
							"Turn on 'Consent Confirmed' to subscribe this contact",
							{
								itemIndex: i,
								description:
									"Banger subscribes a contact only with their permission. If you don't have it, set 'Subscription Status' to Unsubscribed.",
							},
						);
					}
					const body: IDataObject = {
						email: (this.getNodeParameter('email', i) as string).trim(),
						status,
						consent_confirmed: consentConfirmed,
					};
					if (additional.displayName) body.display_name = additional.displayName;
					const attributes = nameValuePairs(additional.attributes as IDataObject, 'attribute');
					if (attributes.length) body.attributes = nameValueObject(attributes);
					if (consentConfirmed) {
						const evidence: IDataObject = { source: (additional.consentSource as string) || 'n8n' };
						if (additional.consentReference) evidence.reference = additional.consentReference;
						if (additional.consentStatement) evidence.statement = additional.consentStatement;
						body.consent_evidence = evidence;
					}
					const response = await bangerApiRequest.call(
						this,
						'POST',
						`${workspacePath}/contacts/upsert`,
						body,
						undefined,
						{
							'Idempotency-Key': idempotencyKey.call(
								this,
								'contact-upsert',
								i,
								additional.idempotencyKey as string,
							),
						},
					);
					result = response.data as IDataObject;
				} else if (resource === 'contact' && operation === 'get') {
					const contactId = await resolveContactId.call(this, workspacePath, i);
					const response = await bangerApiRequest.call(
						this,
						'GET',
						`${workspacePath}/contacts/${contactId}`,
					);
					result = response.data as IDataObject;
				} else if (
					resource === 'contact' &&
					(operation === 'addToList' || operation === 'removeFromList')
				) {
					const contactId = await resolveContactId.call(this, workspacePath, i);
					const listId = resourceLocatorValue.call(this, 'list', i).value;
					await bangerApiRequest.call(
						this,
						operation === 'addToList' ? 'POST' : 'DELETE',
						`${workspacePath}/contact-lists/${encodeURIComponent(listId)}/members`,
						{ contact_ids: [contactId] },
					);
					result = {
						contact_id: contactId,
						list_id: listId,
						member: operation === 'addToList',
					};
				} else if (resource === 'journey' && operation === 'send') {
					const journeyKey = resourceLocatorValue.call(this, 'journeyKey', i).value;
					const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
					const to = (this.getNodeParameter('to', i) as string).trim();
					const body: IDataObject = {
						to: additional.recipientName ? [{ email: to, name: additional.recipientName }] : to,
					};
					const variables = nameValuePairs(
						this.getNodeParameter('variables', i) as IDataObject,
						'variable',
					);
					if (variables.length) body.variables = nameValueObject(variables);
					if (additional.replyTo)
						body.reply_to = [{ email: (additional.replyTo as string).trim() }];
					if (additional.locale) body.locale = additional.locale;
					if (additional.timeZone) body.time_zone = additional.timeZone;
					if (additional.mailboxId) body.mailbox_id = additional.mailboxId;
					if (additional.subject) body.subject = additional.subject;
					if (additional.html) body.body_html = additional.html;
					if (additional.text) body.body_text = additional.text;
					const response = await bangerApiRequest.call(
						this,
						'POST',
						`${workspacePath}/journeys/${encodeURIComponent(journeyKey)}/send`,
						body,
						undefined,
						{
							'Idempotency-Key': idempotencyKey.call(
								this,
								'journey-send',
								i,
								additional.idempotencyKey as string,
							),
						},
					);
					result = response.data as IDataObject;
				} else if (resource === 'journey' && operation === 'enroll') {
					const journeyId = resourceLocatorValue.call(this, 'journeyId', i).value;
					const contactId = await resolveContactId.call(this, workspacePath, i);
					const response = await bangerApiRequest.call(
						this,
						'POST',
						`${workspacePath}/approvals`,
						{
							action_kind: 'sequence.enroll',
							payload: { sequence_id: journeyId, contact_ids: [contactId] },
						},
						undefined,
						{
							'Idempotency-Key': idempotencyKey.call(
								this,
								'journey-enroll',
								i,
								this.getNodeParameter('idempotencyKey', i) as string,
							),
						},
					);
					result = response.data as IDataObject;
				} else if (resource === 'journey' && operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const qs: IDataObject = {};
					for (const [key, value] of Object.entries(filters)) if (value) qs[key] = value;
					const response = await bangerApiRequest.call(
						this,
						'GET',
						`${workspacePath}/journeys`,
						undefined,
						qs,
					);
					const journeys = (response.data as IDataObject[] | undefined) ?? [];
					result = returnAll
						? journeys
						: journeys.slice(0, this.getNodeParameter('limit', i) as number);
				} else if (resource === 'workspace' && operation === 'get') {
					const [workspace, bootstrap] = await Promise.all([
						bangerApiRequest.call(this, 'GET', workspacePath),
						bangerApiRequest.call(this, 'GET', '/v1/bootstrap'),
					]);
					result = {
						...(workspace.data as IDataObject),
						scopes: ((bootstrap.data as IDataObject | undefined)?.capabilities as string[]) ?? [],
					};
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{
							itemIndex: i,
						},
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
							description: (error as { description?: string }).description ?? null,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
