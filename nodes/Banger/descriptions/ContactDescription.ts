import type { INodeProperties } from 'n8n-workflow';

const UUID_REGEX = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export const contactLocator = (
	displayOptions: INodeProperties['displayOptions'],
	description = 'The contact in your Banger audience',
): INodeProperties => ({
	displayName: 'Contact',
	name: 'contact',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description,
	displayOptions,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a contact...',
			typeOptions: { searchListMethod: 'searchContacts', searchable: true },
		},
		{
			displayName: 'By Email',
			name: 'email',
			type: 'string',
			placeholder: 'e.g. nathan@example.com',
			validation: [
				{
					type: 'regex',
					properties: { regex: '^[^@\\s]+@[^@\\s]+$', errorMessage: 'Not a valid email address' },
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 4f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
			validation: [
				{
					type: 'regex',
					properties: { regex: UUID_REGEX, errorMessage: 'Not a valid contact ID' },
				},
			],
		},
	],
});

const listLocator = (displayOptions: INodeProperties['displayOptions']): INodeProperties => ({
	displayName: 'List',
	name: 'list',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'A contact list in Broadcast',
	displayOptions,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a list...',
			typeOptions: { searchListMethod: 'searchContactLists', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 4f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
			validation: [
				{ type: 'regex', properties: { regex: UUID_REGEX, errorMessage: 'Not a valid list ID' } },
			],
		},
	],
});

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{
				name: 'Add to List',
				value: 'addToList',
				description: 'Add a contact to a contact list',
				action: 'Add contact to list',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a contact',
				action: 'Get a contact',
			},
			{
				name: 'Remove From List',
				value: 'removeFromList',
				description: 'Remove a contact from a contact list',
				action: 'Remove contact from list',
			},
		],
		default: 'upsert',
	},
];

const showForUpsert = { resource: ['contact'], operation: ['upsert'] };

export const contactFields: INodeProperties[] = [
	// Create or Update
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. nathan@example.com',
		required: true,
		default: '',
		displayOptions: { show: showForUpsert },
	},
	{
		displayName: 'Subscription Status',
		name: 'status',
		type: 'options',
		options: [
			{
				name: 'Subscribed',
				value: 'subscribed',
				description: 'The contact agreed to receive your email',
			},
			{
				name: 'Unsubscribed',
				value: 'unsubscribed',
				description: 'The contact does not receive Broadcasts',
			},
		],
		default: 'subscribed',
		displayOptions: { show: showForUpsert },
	},
	{
		displayName: 'Consent Confirmed',
		name: 'consentConfirmed',
		type: 'boolean',
		default: false,
		description:
			'Whether this person gave you permission to email them. Banger subscribes a contact only when this is on.',
		displayOptions: { show: { ...showForUpsert, status: ['subscribed'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForUpsert },
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Attribute',
				description: 'Contact fields such as plan or company. Banger merges them into the contact.',
				options: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. plan',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g. pro',
							},
						],
					},
				],
			},
			{
				displayName: 'Consent Reference',
				name: 'consentReference',
				type: 'string',
				default: '',
				placeholder: 'e.g. order-1042',
				description: 'An ID that proves the consent, such as a form submission or order',
			},
			{
				displayName: 'Consent Source',
				name: 'consentSource',
				type: 'string',
				default: '',
				placeholder: 'e.g. Checkout opt-in',
				description: 'Where the contact gave consent. Defaults to n8n.',
			},
			{
				displayName: 'Consent Statement',
				name: 'consentStatement',
				type: 'string',
				default: '',
				placeholder: 'e.g. Send me product news',
				description: 'The words the contact agreed to',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Nathan Smith',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Banger applies the change once per key. Leave empty to use a key made from this execution, node and item.',
			},
		],
	},

	// Get / Add to List / Remove From List
	contactLocator({
		show: { resource: ['contact'], operation: ['get', 'addToList', 'removeFromList'] },
	}),
	listLocator({ show: { resource: ['contact'], operation: ['addToList', 'removeFromList'] } }),
];
