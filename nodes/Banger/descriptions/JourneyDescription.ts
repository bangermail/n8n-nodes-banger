import type { INodeProperties } from 'n8n-workflow';

import { contactLocator } from './ContactDescription';

export const journeyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['journey'] } },
		options: [
			{
				name: 'Enroll Contact',
				value: 'enroll',
				description:
					'Start a Journey for a contact. Banger may hold the enrollment in Approvals until a person decides.',
				action: 'Enroll contact in a journey',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of Journeys',
				action: 'Get many journeys',
			},
			{
				name: 'Send Email',
				value: 'send',
				description: 'Send the email of an API Journey to one recipient',
				action: 'Send a journey email',
			},
			{
				name: 'Send Event',
				value: 'sendEvent',
				description:
					'Send an event, such as signup or trial_started, that starts or ends the Journeys listening for it. Those Journeys send email.',
				action: 'Send an event to journeys',
			},
		],
		default: 'send',
	},
];

const showForSend = { resource: ['journey'], operation: ['send'] };
const showForEnroll = { resource: ['journey'], operation: ['enroll'] };
const showForGetAll = { resource: ['journey'], operation: ['getAll'] };
const showForSendEvent = { resource: ['journey'], operation: ['sendEvent'] };

export const journeyFields: INodeProperties[] = [
	// Send Email
	{
		displayName: 'Journey',
		name: 'journeyKey',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description: 'An API Journey. Your code and workflows trigger it by its key.',
		displayOptions: { show: showForSend },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Journey...',
				typeOptions: { searchListMethod: 'searchApiJourneys', searchable: true },
			},
			{
				displayName: 'By Key',
				name: 'key',
				type: 'string',
				placeholder: 'e.g. welcome',
			},
		],
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'The one recipient of this Journey email',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Variable',
		description: 'Values the Journey email uses, such as first_name or order_total',
		displayOptions: { show: showForSend },
		options: [
			{
				displayName: 'Variable',
				name: 'variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. first_name',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g. Nathan',
					},
				],
			},
		],
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
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'Email HTML, for a Journey whose content comes from your code',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Banger sends once per key. Leave empty to use a key made from this execution, node and item. Use 16 to 128 characters.',
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'e.g. pt-BR',
				description: 'Language of the recipient, for Journeys with translated content',
			},
			{
				displayName: 'Mailbox Name or ID',
				name: 'mailboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMailboxes' },
				default: '',
				description:
					'Mailbox that sends the email, when the Journey has none. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Recipient Name',
				name: 'recipientName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Nathan Smith',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'e.g. support@acme.com',
				description:
					"Address that receives replies. Leave empty to send replies to the Journey's mailbox.",
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Email subject, for a Journey whose content comes from your code',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'Plain-text email, for a Journey whose content comes from your code',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				placeholder: 'e.g. America/Sao_Paulo',
				description: 'Time zone of the recipient, for Journeys that wait until a local time',
			},
		],
	},

	// Enroll Contact
	{
		displayName: 'Journey',
		name: 'journeyId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		displayOptions: { show: showForEnroll },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Journey...',
				typeOptions: { searchListMethod: 'searchJourneys', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 4f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
			},
		],
	},
	contactLocator({ show: showForEnroll }, 'The contact to enroll'),
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		default: '',
		description:
			'Banger enrolls once per key. Leave empty to use a key made from this execution, node and item. Use 16 to 128 characters.',
		displayOptions: { show: showForEnroll },
	},

	// Send Event
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. trial_started',
		description:
			'The event name Journey triggers and goals listen for. Use letters, digits and the characters _ . : and -.',
		displayOptions: { show: showForSendEvent },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'The person the event is about. Journeys enroll or stop them.',
		displayOptions: { show: showForSendEvent },
	},
	{
		displayName: 'Additional Fields',
		name: 'eventFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForSendEvent },
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Attribute',
				description: 'Up to 50 values Journey conditions and emails can read, such as plan or seats',
				options: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Connection ID',
				name: 'connectionId',
				type: 'string',
				default: '',
				description:
					'Send the event as if it came from another incoming webhook of this product, such as your Stripe source, so Journeys built on it react. Leave empty to use Banger API events.',
			},
			{
				displayName: 'Event ID',
				name: 'eventId',
				type: 'string',
				default: '',
				description:
					'Your ID for this event. Banger handles each ID once. Leave empty to use an ID made from this execution, node and item.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. Nathan Smith',
				description: 'Name of the person the event is about',
			},
			{
				displayName: 'Occurred At',
				name: 'occurredAt',
				type: 'dateTime',
				default: '',
				description: 'When the event happened. Defaults to when Banger receives it.',
			},
			{
				displayName: 'Product Name or ID',
				name: 'productId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProducts' },
				default: '',
				description:
					'Leave empty with an API key made for one product. Set it only for a workspace-wide key in a workspace with more than one product. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	// Get Many
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showForGetAll },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...showForGetAll, returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showForGetAll },
		options: [
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'e.g. welcome',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Discovered', value: 'discovered' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Paused', value: 'paused' },
				],
				default: 'active',
			},
			{
				displayName: 'Trigger',
				name: 'trigger_kind',
				type: 'options',
				options: [
					{ name: 'API', value: 'api' },
					{ name: 'Audience Joined', value: 'audience_joined' },
					{ name: 'Contact Created', value: 'contact_created' },
					{ name: 'Event', value: 'event' },
					{ name: 'Inbound Email', value: 'inbound_email' },
					{ name: 'Manual', value: 'manual' },
					{ name: 'Schedule', value: 'schedule' },
				],
				default: 'api',
			},
		],
	},
];
