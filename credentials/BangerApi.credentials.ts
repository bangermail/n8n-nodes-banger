import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BangerApi implements ICredentialType {
	name = 'bangerApi';

	displayName = 'Banger API';

	icon: Icon = { light: 'file:../icons/banger.svg', dark: 'file:../icons/banger.svg' };

	documentationUrl =
		'https://github.com/bangermail/n8n-nodes-banger?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'e.g. bgr_abc123def456_...',
			description:
				'A workspace API key from Banger. In the Banger web app, open API keys in the sidebar and choose Create API key. The key works for one product.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.bangermail.com',
			url: '/v1/bootstrap',
		},
	};
}
