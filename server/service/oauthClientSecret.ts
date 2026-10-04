import { assertClientSecret } from './clientSecret';
import { CognitoError } from './cognitoAssert';
import { prismaClient } from './prismaClient';

const basicCredentials = (authorization: string | undefined): [string, string] | null => {
  if (!authorization?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 1) return null;
  return [decoded.slice(0, separator), decoded.slice(separator + 1)];
};

// oxlint-disable-next-line complexity
export const authenticateOAuthClient = async (request: {
  authorization?: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<string | null> => {
  const basic = basicCredentials(request.authorization);
  if (request.authorization && !basic) return null;
  if (basic && (request.clientSecret || (request.clientId && request.clientId !== basic[0]))) {
    return null;
  }

  const clientId = basic?.[0] ?? request.clientId;
  if (!clientId) return null;
  const client = await prismaClient.userPoolClient.findUnique({ where: { id: clientId } });
  if (!client) return null;
  const secretCount = await prismaClient.userPoolClientSecret.count({ where: { clientId } });
  if (secretCount === 0 && (basic || request.clientSecret)) return null;
  try {
    await assertClientSecret(prismaClient, clientId, basic?.[1] ?? request.clientSecret);
    return clientId;
  } catch (error) {
    if (error instanceof CognitoError) return null;
    throw error;
  }
};
