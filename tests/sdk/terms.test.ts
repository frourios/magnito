/* oxlint-disable complexity */
import assert from 'node:assert';
import {
  CreateTermsCommand,
  DeleteTermsCommand,
  DescribeTermsCommand,
  ListTermsCommand,
  UpdateTermsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { expect, test } from 'vitest';
import { loadManagedLoginConfig } from '../../server/domain/userPool/service/managedLoginConfig';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';

const termsLink = 'https://example.test/terms';
const privacyLink = 'https://example.test/privacy';
const create = (name: 'terms-of-use' | 'privacy-policy', links: Record<string, string>) =>
  cognitoClient.send(
    new CreateTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      TermsName: name,
      TermsSource: 'LINK',
      Enforcement: 'NONE',
      Links: links,
    }),
  );

test('Terms CRUD, pagination and managed login links', async () => {
  await prismaClient.userPoolClient.update({
    where: { id: DEFAULT_USER_POOL_CLIENT_ID },
    data: { allowedOAuthFlowsUserPoolClient: true, allowedOAuthFlows: ['code'] },
  });
  await prismaClient.userPoolDomain.create({
    data: {
      domain: 'managed',
      userPoolId: DEFAULT_USER_POOL_ID,
      managedLoginVersion: 2,
      createdAt: new Date(),
    },
  });
  expect((await loadManagedLoginConfig(DEFAULT_USER_POOL_CLIENT_ID))?.terms).toBeNull();
  const created = await create('terms-of-use', { 'cognito:default': termsLink });
  const termsId = created.Terms?.TermsId;
  assert(termsId);
  expect(created.Terms?.Links).toEqual({ 'cognito:default': termsLink });
  expect(created.Terms?.CreationDate).toBeInstanceOf(Date);
  expect((await loadManagedLoginConfig(DEFAULT_USER_POOL_CLIENT_ID))?.terms).toBeNull();
  const privacy = await create('privacy-policy', { 'cognito:default': privacyLink });
  const privacyId = privacy.Terms?.TermsId;
  assert(privacyId);
  expect((await loadManagedLoginConfig(DEFAULT_USER_POOL_CLIENT_ID))?.terms).toEqual({
    termsOfUse: { 'cognito:default': termsLink },
    privacyPolicy: { 'cognito:default': privacyLink },
  });
  await expect(create('terms-of-use', {})).rejects.toMatchObject({ name: 'TermsExistsException' });
  const firstPage = await cognitoClient.send(
    new ListTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, MaxResults: 1 }),
  );
  expect(firstPage.Terms).toHaveLength(1);
  assert(firstPage.NextToken);
  const secondPage = await cognitoClient.send(
    new ListTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      MaxResults: 1,
      NextToken: firstPage.NextToken,
    }),
  );
  expect(secondPage.Terms).toHaveLength(1);
  expect(secondPage.NextToken).toBeUndefined();
  expect(
    (await cognitoClient.send(new ListTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID }))).Terms,
  ).toHaveLength(2);
  expect(
    (
      await cognitoClient.send(
        new DescribeTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, TermsId: termsId }),
      )
    ).Terms?.TermsName,
  ).toBe('terms-of-use');
  const changed = await cognitoClient.send(
    new UpdateTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      TermsId: termsId,
      Links: { 'cognito:default': termsLink, 'cognito:japanese': `${termsLink}/ja` },
    }),
  );
  expect(changed.Terms?.Links?.['cognito:japanese']).toBe(`${termsLink}/ja`);
  expect(
    (await loadManagedLoginConfig(DEFAULT_USER_POOL_CLIENT_ID))?.terms?.termsOfUse[
      'cognito:japanese'
    ],
  ).toBe(`${termsLink}/ja`);
  await expect(
    cognitoClient.send(
      new UpdateTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        TermsId: termsId,
        TermsName: 'privacy-policy',
      }),
    ),
  ).rejects.toMatchObject({ name: 'TermsExistsException' });
  await cognitoClient.send(
    new DeleteTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, TermsId: privacyId }),
  );
  expect((await loadManagedLoginConfig(DEFAULT_USER_POOL_CLIENT_ID))?.terms).toBeNull();
  await expect(
    cognitoClient.send(
      new DescribeTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, TermsId: privacyId }),
    ),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
});

test('Terms reject unsupported fields, links and missing resources', async () => {
  await expect(create('terms-of-use', { 'cognito:invalid': termsLink })).rejects.toMatchObject({
    name: 'InvalidParameterException',
  });
  await expect(
    create('terms-of-use', { 'cognito:default': 'javascript:alert(1)' }),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(create('terms-of-use', { 'cognito:default': 'not a url' })).rejects.toMatchObject({
    name: 'InvalidParameterException',
  });
  await expect(
    cognitoClient.send(
      new CreateTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        TermsName: 'terms-of-use',
        TermsSource: 'LINK',
        Enforcement: 'NONE',
        Links: {
          'cognito:default': termsLink,
          ...Object.fromEntries(
            Array.from({ length: 13 }, (_, i) => [`cognito:extra${i}`, termsLink]),
          ),
        },
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(
      new CreateTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        TermsName: 'wrong',
        TermsSource: 'LINK',
        Enforcement: 'NONE',
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(
      new CreateTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: 'missing-client',
        TermsName: 'terms-of-use',
        TermsSource: 'LINK',
        Enforcement: 'NONE',
        Links: {},
      }),
    ),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
  await expect(
    cognitoClient.send(new ListTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, MaxResults: 0 })),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(
      new ListTermsCommand({ UserPoolId: DEFAULT_USER_POOL_ID, NextToken: '!!!' }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(new ListTermsCommand({ UserPoolId: 'missing' })),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
  await expect(
    cognitoClient.send(
      new DeleteTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        TermsId: '00000000-0000-4000-8000-000000000000',
      }),
    ),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
  const created = await cognitoClient.send(
    new CreateTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      TermsName: 'terms-of-use',
      TermsSource: 'LINK',
      Enforcement: 'NONE',
    }),
  );
  const id = created.Terms?.TermsId;
  assert(id);
  expect(created.Terms?.Links).toEqual({});
  await expect(
    cognitoClient.send(new UpdateTermsCommand({ UserPoolId: 'missing', TermsId: id })),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
  const updated = await cognitoClient.send(
    new UpdateTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      TermsId: id,
      TermsName: 'privacy-policy',
      Links: { 'cognito:english': termsLink },
    }),
  );
  expect(updated.Terms?.TermsName).toBe('privacy-policy');
  expect(updated.Terms?.Links).toEqual({ 'cognito:english': termsLink });
  const renamedWithoutLinks = await cognitoClient.send(
    new UpdateTermsCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      TermsId: id,
      TermsName: 'privacy-policy',
    }),
  );
  expect(renamedWithoutLinks.Terms?.Links).toEqual({ 'cognito:english': termsLink });
  await expect(
    cognitoClient.send(
      new ListTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        NextToken: Buffer.from('999999999999999999999999').toString('base64url'),
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(
      new CreateTermsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        TermsName: 'terms-of-use',
        TermsSource: 'INVALID' as 'LINK',
        Enforcement: 'NONE',
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
});
