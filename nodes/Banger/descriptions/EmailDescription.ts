import type { INodeProperties } from 'n8n-workflow';

const showForSend = { resource: ['email'], operation: ['send'] };

export const emailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['email'] } },
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a Product email from one of your domains',
				action: 'Send an email',
			},
		],
		default: 'send',
	},
];

export const emailFields: INodeProperties[] = [
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme <hello@acme.com>',
		description: 'Sender address on a domain set up for Product email in Banger',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'Recipient address. Separate several addresses with commas.',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Your receipt',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'Reply To',
		name: 'replyTo',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. support@acme.com',
		description: 'Address that receives replies. Banger needs one for every Product email.',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'Email Format',
		name: 'emailFormat',
		type: 'options',
		options: [
			{ name: 'HTML', value: 'html' },
			{ name: 'Text', value: 'text' },
			{ name: 'Both', value: 'both' },
		],
		default: 'html',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		required: true,
		typeOptions: { rows: 5 },
		default: '',
		placeholder: 'e.g. <p>Thanks for your order.</p>',
		displayOptions: { show: { ...showForSend, emailFormat: ['html', 'both'] } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: { rows: 5 },
		default: '',
		placeholder: 'e.g. Thanks for your order.',
		displayOptions: { show: { ...showForSend, emailFormat: ['text', 'both'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForSend },
		options: [
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				placeholder: 'e.g. audit@acme.com',
				description: 'Separate several addresses with commas',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				placeholder: 'e.g. team@acme.com',
				description: 'Separate several addresses with commas',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Header',
				options: [
					{
						displayName: 'Header',
						name: 'header',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Banger sends once per key. Leave empty to use a key made from this execution, node and item.',
			},
			{
				displayName: 'Product Name or ID',
				name: 'productId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProducts' },
				default: '',
				description:
					'Leave empty with an API key made for one product: Banger sends as that product. Set it only for a workspace-wide key in a workspace with more than one product. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Tag',
				description: 'Labels you can filter on in Logs',
				options: [
					{
						displayName: 'Tag',
						name: 'tag',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
		],
	},
];
