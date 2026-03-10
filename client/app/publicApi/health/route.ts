import { cognito } from 'server/service/cognito';
import { CustomError } from 'server/service/customAssert';
import { prismaClient } from 'server/service/prismaClient';
import { checkSmtpHealth } from 'server/service/sendMail';
import { createRoute } from './frourio.server';

function throwCustomError(label: string) {
  return (e: Error): never => {
    /* v8 ignore next 1 */
    throw new CustomError(`${label} ${e.message}`);
  };
}

export const { GET } = createRoute({
  get: async () => ({
    status: 200,
    body: await Promise.all([
      prismaClient.$queryRaw`SELECT CURRENT_TIMESTAMP;`.catch(throwCustomError('DB')),
      checkSmtpHealth().catch(throwCustomError('SMTP')),
      cognito.health().catch(throwCustomError('Cognito')),
    ]).then(() => 'ok'),
  }),
});
