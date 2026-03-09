import assert from 'assert';
import {
  AssociateSoftwareTokenCommand,
  GetUserCommand,
  SetUserMFAPreferenceCommand,
  VerifySoftwareTokenCommand,
  VerifySoftwareTokenResponseType,
} from '@aws-sdk/client-cognito-identity-provider';
import { MFA_SETTING_LIST } from 'common/constants';
import { authenticator } from 'otplib';
import { cognitoClient } from 'service/cognito';
import { createCognitoUserAndToken } from 'tests/api/utils';
import { expect, test } from 'vitest';

test(AssociateSoftwareTokenCommand.name, async () => {
  const token = await createCognitoUserAndToken();
  const session = 'dummySession';

  const res = await cognitoClient.send(
    new AssociateSoftwareTokenCommand({ AccessToken: token.AccessToken, Session: session }),
  );

  expect(res.SecretCode).toHaveLength(16);
  expect(res.Session).toBe(session);
});

test(VerifySoftwareTokenCommand.name, async () => {
  const token = await createCognitoUserAndToken();
  const session = 'dummySession';

  const { SecretCode } = await cognitoClient.send(
    new AssociateSoftwareTokenCommand({ AccessToken: token.AccessToken, Session: session }),
  );

  assert(SecretCode);

  const res = await cognitoClient.send(
    new VerifySoftwareTokenCommand({
      AccessToken: token.AccessToken,
      Session: session,
      UserCode: authenticator.generate(SecretCode),
    }),
  );

  expect(res.Status).toBe(VerifySoftwareTokenResponseType.SUCCESS);
});

test(SetUserMFAPreferenceCommand.name, async () => {
  const token = await createCognitoUserAndToken();
  const session = 'dummySession';

  const { SecretCode } = await cognitoClient.send(
    new AssociateSoftwareTokenCommand({ AccessToken: token.AccessToken, Session: session }),
  );

  assert(SecretCode);

  await cognitoClient.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: token.AccessToken,
      SoftwareTokenMfaSettings: { PreferredMfa: true, Enabled: true },
    }),
  );

  const user1 = await cognitoClient.send(new GetUserCommand(token));

  expect(user1.PreferredMfaSetting).toBe(MFA_SETTING_LIST['0']);
  expect(user1.UserMFASettingList?.[0]).toBe(MFA_SETTING_LIST['0']);

  await cognitoClient.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: token.AccessToken,
      SoftwareTokenMfaSettings: { PreferredMfa: false, Enabled: false },
    }),
  );

  const user2 = await cognitoClient.send(new GetUserCommand(token));

  expect(user2.PreferredMfaSetting).toBe(undefined);
  expect(user2.UserMFASettingList).toBe(undefined);

  await cognitoClient.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: token.AccessToken,
      SoftwareTokenMfaSettings: { PreferredMfa: true, Enabled: true },
    }),
  );

  await cognitoClient.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: token.AccessToken,
      SoftwareTokenMfaSettings: {},
    }),
  );

  const user3 = await cognitoClient.send(new GetUserCommand(token));

  expect(user3.PreferredMfaSetting).toBe(MFA_SETTING_LIST['0']);
  expect(user3.UserMFASettingList?.[0]).toBe(MFA_SETTING_LIST['0']);
});
