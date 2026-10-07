import type { INodeProperties } from 'n8n-workflow';

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workspace'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve the workspace of this API key',
				action: 'Get the workspace',
			},
		],
		default: 'get',
	},
];
