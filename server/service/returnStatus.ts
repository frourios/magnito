import { COGNITO_ERRORS, CognitoError } from './cognitoAssert';

export const returnSuccess = <T>(val: T): { status: 200; body: T } => ({ status: 200, body: val });

const logErr = (e: unknown): void => {
  if (!(e instanceof Error)) return;

  console.log(new Date(), e.stack);
};

export const returnGetError = (e: unknown): { status: 404 } => {
  logErr(e);

  return { status: 404 };
};

export const returnPostError = (
  e: unknown,
):
  | {
      status: 400;
      headers: Record<'X-Amzn-Errormessage' | 'X-Amzn-Errortype', string>;
      body: { message: string; __type: string };
    }
  | { status: 403; body: Record<string, never> } => {
  if (e instanceof CognitoError) {
    const type = COGNITO_ERRORS[e.message as keyof typeof COGNITO_ERRORS];

    return {
      status: 400,
      headers: { 'X-Amzn-Errormessage': e.message, 'X-Amzn-Errortype': type },
      body: { message: e.message, __type: type },
    };
  }

  logErr(e);

  return { status: 403, body: {} };
};
