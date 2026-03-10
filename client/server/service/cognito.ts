import {
  CognitoIdentityProviderClient,
  ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ACCESS_KEY, SERVER_PORT, REGION, SECRET_KEY } from './serverEnvs';

export const cognitoClient = new CognitoIdentityProviderClient({
  endpoint: `http://localhost:${SERVER_PORT}`,
  region: REGION,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

export const cognito = {
  health: async (): Promise<boolean> => {
    const command = new ListUserPoolsCommand({ MaxResults: 1 });

    return await cognitoClient.send(command).then(() => true);
  },
};
