import { userPoolUseCase } from 'server/domain/userPool/useCase/userPoolUseCase';
import { cognito } from 'server/service/cognito';
import { CustomError } from 'server/service/customAssert';
import { checkSmtpHealth } from 'server/service/sendMail';
import { createRoute } from './frourio.server';

function throwCustomError(label: string) {
  /* v8 ignore next */
  return (e: Error): never => {
    throw new CustomError(`${label} ${e.message}`);
  };
}

let initPromise: Promise<void>;

export const { GET } = createRoute({
  get: async () => {
    initPromise ??= userPoolUseCase.initDefaults();

    return {
      status: 200,
      body: await Promise.all([
        initPromise.catch(throwCustomError('DB')),
        checkSmtpHealth().catch(throwCustomError('SMTP')),
        cognito.health().catch(throwCustomError('Cognito')),
      ]).then(() => 'ok'),
    };
  },
});
