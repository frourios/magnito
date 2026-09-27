import assert from 'assert';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  DescribeUserPoolCommand,
  SignUpCommand,
  UpdateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { expect, test } from 'vitest';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';

// oxlint-disable-next-line complexity
test('pool policies use columns, return defaults, and update password requirements', async () => {
  const created = await cognitoClient.send(
    new CreateUserPoolCommand({
      PoolName: 'policy-pool',
      Policies: {
        PasswordPolicy: {
          MinimumLength: 6,
          RequireLowercase: false,
          RequireUppercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
          PasswordHistorySize: 2,
          TemporaryPasswordValidityDays: 0,
        },
        SignInPolicy: { AllowedFirstAuthFactors: ['PASSWORD', 'EMAIL_OTP'] },
      },
    }),
  );
  const poolId = created.UserPool?.Id;
  assert(poolId);
  const stored = await prismaClient.userPool.findUniqueOrThrow({ where: { id: poolId } });
  expect(stored.passwordMinimumLength).toBe(6);
  expect(stored.passwordHistorySize).toBe(2);
  expect(stored.temporaryPasswordValidityDays).toBe(7);
  expect(stored.allowedFirstAuthFactors).toEqual(['PASSWORD', 'EMAIL_OTP']);
  const described = await cognitoClient.send(new DescribeUserPoolCommand({ UserPoolId: poolId }));
  expect(described.UserPool?.Policies).toMatchObject({
    PasswordPolicy: {
      MinimumLength: 6,
      RequireLowercase: false,
      RequireUppercase: false,
      RequireNumbers: false,
      RequireSymbols: false,
      PasswordHistorySize: 2,
      TemporaryPasswordValidityDays: 7,
    },
    SignInPolicy: { AllowedFirstAuthFactors: ['PASSWORD', 'EMAIL_OTP'] },
  });

  await cognitoClient.send(
    new UpdateUserPoolCommand({
      UserPoolId: poolId,
      Policies: { PasswordPolicy: { MinimumLength: 12, RequireSymbols: false } },
    }),
  );
  const updated = await cognitoClient.send(new DescribeUserPoolCommand({ UserPoolId: poolId }));
  expect(updated.UserPool?.Policies?.PasswordPolicy).toMatchObject({
    MinimumLength: 12,
    RequireLowercase: true,
    RequireUppercase: true,
    RequireNumbers: true,
    RequireSymbols: false,
    TemporaryPasswordValidityDays: 7,
  });
  expect(updated.UserPool?.Policies?.PasswordPolicy?.PasswordHistorySize).toBeUndefined();
  expect(updated.UserPool?.Policies?.SignInPolicy?.AllowedFirstAuthFactors).toEqual(['PASSWORD']);

  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: poolId, ClientName: 'updated-policy-client' }),
  );
  const clientId = client.UserPoolClient?.ClientId;
  assert(clientId);
  await expect(
    cognitoClient.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: 'shortpolicyuser',
        Password: 'Short1',
        UserAttributes: [{ Name: 'email', Value: 'short@example.com' }],
      }),
    ),
  ).rejects.toThrow('Password not long enough');
  await cognitoClient.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: 'longpolicyuser',
      Password: 'LongPassword1',
      UserAttributes: [{ Name: 'email', Value: 'long@example.com' }],
    }),
  );
  await cognitoClient.send(
    new UpdateUserPoolCommand({ UserPoolId: poolId, Policies: { PasswordPolicy: {} } }),
  );
  await cognitoClient.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: 'spacepolicyuser',
      Password: 'Long Password1',
      UserAttributes: [{ Name: 'email', Value: 'space@example.com' }],
    }),
  );
});

test('password policy validates length, optional character classes, history, and expiry', async () => {
  const created = await cognitoClient.send(
    new CreateUserPoolCommand({
      PoolName: 'password-policy',
      Policies: {
        PasswordPolicy: {
          MinimumLength: 6,
          RequireLowercase: false,
          RequireUppercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
          PasswordHistorySize: 2,
          TemporaryPasswordValidityDays: 1,
        },
      },
    }),
  );
  const poolId = created.UserPool?.Id;
  assert(poolId);
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: poolId, ClientName: 'policy-client' }),
  );
  const clientId = client.UserPoolClient?.ClientId;
  assert(clientId);
  const username = 'policyuser';
  const setPassword = (password: string, permanent = true) =>
    cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: username,
        Password: password,
        Permanent: permanent,
      }),
    );
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: username,
      TemporaryPassword: 'abcdef',
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: 'policy@example.com' }],
    }),
  );
  await expect(setPassword('abcde')).rejects.toThrow('Password not long enough');
  await expect(setPassword('a'.repeat(257))).rejects.toThrow('Password too long');
  await setPassword('abcdef');
  await setPassword('ghijkl');
  await expect(setPassword('abcdef')).rejects.toThrow('Password cannot be reused.');
  await setPassword('mnopqr');
  await setPassword('abcdef');
  await setPassword('stuvwx', false);
  const user = await prismaClient.user.findFirstOrThrow({ where: { name: username } });
  expect(user.temporaryPasswordExpiresAt?.getTime()).toBeGreaterThan(Date.now());
  await prismaClient.user.update({
    where: { id: user.id },
    data: { temporaryPasswordExpiresAt: new Date(Date.now() - 1000) },
  });
  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: poolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: username, PASSWORD: 'stuvwx' },
      }),
    ),
  ).rejects.toThrow('Temporary password has expired.');
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: username,
      MessageAction: 'RESEND',
    }),
  );
  const renewed = await prismaClient.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(renewed.temporaryPasswordExpiresAt?.getTime()).toBeGreaterThan(Date.now());
});

test('invalid policy values are rejected and sign-in policy disables password auth', async () => {
  for (const passwordPolicy of [
    { MinimumLength: 5 },
    { PasswordHistorySize: 25 },
    { TemporaryPasswordValidityDays: 366 },
  ]) {
    await expect(
      cognitoClient.send(
        new CreateUserPoolCommand({
          PoolName: 'invalid-policy',
          Policies: { PasswordPolicy: passwordPolicy },
        }),
      ),
    ).rejects.toThrow('Invalid user pool policy.');
  }
  await expect(
    cognitoClient.send(
      new CreateUserPoolCommand({
        PoolName: 'invalid-factor',
        Policies: { SignInPolicy: { AllowedFirstAuthFactors: ['SOFTWARE_TOKEN' as 'PASSWORD'] } },
      }),
    ),
  ).rejects.toThrow('Invalid user pool policy.');

  const created = await cognitoClient.send(
    new CreateUserPoolCommand({
      PoolName: 'otp-only',
      Policies: { SignInPolicy: { AllowedFirstAuthFactors: ['EMAIL_OTP'] } },
    }),
  );
  const poolId = created.UserPool?.Id;
  assert(poolId);
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: poolId, ClientName: 'otp-client' }),
  );
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: 'otpuser',
      TemporaryPassword: 'Temporary-password1!',
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: 'otp@example.com' }],
    }),
  );
  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: poolId,
        ClientId: client.UserPoolClient?.ClientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: 'otpuser', PASSWORD: 'Temporary-password1!' },
      }),
    ),
  ).rejects.toThrow('Password sign-in is disabled.');
});
