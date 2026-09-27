import assert from 'assert';
import {
  CreateManagedLoginBrandingCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  DescribeManagedLoginBrandingByClientCommand,
  DescribeManagedLoginBrandingCommand,
  UpdateManagedLoginBrandingCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { expect, test } from 'vitest';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';

// oxlint-disable-next-line complexity
test('ReturnMergedResources returns default settings with the saved overrides', async () => {
  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'merged-branding' }));
  const userPoolId = pool.UserPool?.Id;
  assert(userPoolId);
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: userPoolId, ClientName: 'branding-client' }),
  );
  const clientId = client.UserPoolClient?.ClientId;
  assert(clientId);
  const created = await cognitoClient.send(
    new CreateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      UseCognitoProvidedValues: true,
    }),
  );
  const brandingId = created.ManagedLoginBranding?.ManagedLoginBrandingId;
  assert(brandingId);
  expect(created.ManagedLoginBranding?.Settings).toBeUndefined();

  const describeByClient = (returnMergedResources?: boolean) =>
    cognitoClient.send(
      new DescribeManagedLoginBrandingByClientCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
        ReturnMergedResources: returnMergedResources,
      }),
    );
  expect((await describeByClient()).ManagedLoginBranding?.Settings).toBeUndefined();
  expect((await describeByClient(false)).ManagedLoginBranding?.Settings).toBeUndefined();
  const defaults = await describeByClient(true);
  expect(defaults.ManagedLoginBranding?.Settings).toMatchObject({
    categories: { form: { displayGraphics: true }, global: { pageHeader: { enabled: false } } },
    componentClasses: { buttons: { borderRadius: 8 } },
    components: { favicon: { enabledTypes: ['ICO', 'SVG'] } },
  });
  expect(defaults.ManagedLoginBranding?.Assets).toEqual([]);

  await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
      Settings: {
        components: { form: { logo: { enabled: true } }, favicon: { enabledTypes: ['SVG'] } },
      },
      Assets: [
        {
          Category: 'FORM_LOGO',
          ColorMode: 'LIGHT',
          Extension: 'PNG',
          Bytes: new Uint8Array([1, 2, 3]),
        },
      ],
    }),
  );
  const saved = await prismaClient.managedLoginBranding.findUniqueOrThrow({
    where: { id: brandingId },
  });
  expect(saved.settings).toEqual({
    components: { form: { logo: { enabled: true } }, favicon: { enabledTypes: ['SVG'] } },
  });

  const byId = (returnMergedResources?: boolean) =>
    cognitoClient.send(
      new DescribeManagedLoginBrandingCommand({
        UserPoolId: userPoolId,
        ManagedLoginBrandingId: brandingId,
        ReturnMergedResources: returnMergedResources,
      }),
    );
  expect((await byId()).ManagedLoginBranding?.Settings).toEqual(saved.settings);
  expect((await byId(false)).ManagedLoginBranding?.Settings).toEqual(saved.settings);
  const mergedById = await byId(true);
  expect(mergedById.ManagedLoginBranding?.Settings).toMatchObject({
    categories: { form: { displayGraphics: true } },
    components: {
      form: { logo: { enabled: true, position: 'TOP' } },
      favicon: { enabledTypes: ['SVG'] },
    },
  });
  expect(mergedById.ManagedLoginBranding?.Assets?.[0]?.Bytes).toEqual(new Uint8Array([1, 2, 3]));
  const mergedByClient = await describeByClient(true);
  expect(mergedByClient.ManagedLoginBranding?.Settings).toEqual(
    mergedById.ManagedLoginBranding?.Settings,
  );
});
