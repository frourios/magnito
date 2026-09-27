import {
  CreateIdentityProviderCommand,
  CreateManagedLoginBrandingCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  CreateUserPoolDomainCommand,
  DeleteManagedLoginBrandingCommand,
  DescribeManagedLoginBrandingCommand,
  DescribeManagedLoginBrandingByClientCommand,
  DescribeIdentityProviderCommand,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
  DescribeUserPoolDomainCommand,
  ListIdentityProvidersCommand,
  UpdateUserPoolClientCommand,
  UpdateUserPoolDomainCommand,
  UpdateManagedLoginBrandingCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { expect, test } from 'vitest';
import { userPoolConfigUpdateUseCase } from '../../server/domain/userPool/useCase/userPoolConfigUpdateUseCase';
import {
  userPoolConfigUseCase,
  type CustomDomainConfigWithSecurityPolicy,
} from '../../server/domain/userPool/useCase/userPoolConfigUseCase';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';

// oxlint-disable-next-line complexity
test('Cognito pool, client, and IdP settings round trip', async () => {
  const createdPool = await cognitoClient.send(
    new CreateUserPoolCommand({
      PoolName: 'configuredPool',
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
      MfaConfiguration: 'OPTIONAL',
      Policies: { PasswordPolicy: { MinimumLength: 12 } },
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
    }),
  );
  const userPoolId = createdPool.UserPool?.Id;
  expect(userPoolId).toBeDefined();

  const pool = await cognitoClient.send(new DescribeUserPoolCommand({ UserPoolId: userPoolId }));
  expect(pool.UserPool).toMatchObject({
    Id: userPoolId,
    Name: 'configuredPool',
    UsernameAttributes: ['email'],
    AutoVerifiedAttributes: ['email'],
    MfaConfiguration: 'OPTIONAL',
    Policies: { PasswordPolicy: { MinimumLength: 12 } },
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
  });
  expect(pool.UserPool?.Domain).toBeUndefined();
  expect(pool.UserPool?.CustomDomain).toBeUndefined();

  const provider = await cognitoClient.send(
    new CreateIdentityProviderCommand({
      UserPoolId: userPoolId,
      ProviderName: 'Google',
      ProviderType: 'Google',
      ProviderDetails: { client_id: 'social-client', client_secret: 'social-secret' },
      AttributeMapping: { email: 'email' },
    }),
  );
  expect(provider.IdentityProvider?.ProviderName).toBe('Google');
  const describedProvider = await cognitoClient.send(
    new DescribeIdentityProviderCommand({ UserPoolId: userPoolId, ProviderName: 'Google' }),
  );
  expect(describedProvider.IdentityProvider?.ProviderDetails).toMatchObject({
    client_id: 'social-client',
  });

  const createdClient = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: 'configuredClient',
      GenerateSecret: true,
      ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH'],
      SupportedIdentityProviders: ['COGNITO', 'Google'],
      AllowedOAuthFlows: ['code'],
      AllowedOAuthScopes: ['openid', 'email'],
      CallbackURLs: ['https://example.com/callback'],
      LogoutURLs: ['https://example.com/logout'],
      AllowedOAuthFlowsUserPoolClient: true,
      DefaultRedirectURI: 'https://example.com/callback',
    }),
  );
  const clientId = createdClient.UserPoolClient?.ClientId;
  expect(createdClient.UserPoolClient?.ClientSecret).toBeTruthy();

  const client = await cognitoClient.send(
    new DescribeUserPoolClientCommand({ UserPoolId: userPoolId, ClientId: clientId }),
  );
  expect(client.UserPoolClient).toMatchObject({
    ClientId: clientId,
    ClientSecret: createdClient.UserPoolClient?.ClientSecret,
    ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH'],
    SupportedIdentityProviders: ['COGNITO', 'Google'],
    AllowedOAuthFlows: ['code'],
    AllowedOAuthScopes: ['openid', 'email'],
    CallbackURLs: ['https://example.com/callback'],
    AllowedOAuthFlowsUserPoolClient: true,
  });

  const updatedClient = await cognitoClient.send(
    new UpdateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      SupportedIdentityProviders: ['COGNITO'],
      AllowedOAuthFlows: ['implicit'],
    }),
  );
  expect(updatedClient.UserPoolClient?.SupportedIdentityProviders).toEqual(['COGNITO']);
  expect(updatedClient.UserPoolClient?.AllowedOAuthFlows).toEqual(['implicit']);
  expect(updatedClient.UserPoolClient?.ClientSecret).toBe(
    createdClient.UserPoolClient?.ClientSecret,
  );

  const providers = await cognitoClient.send(
    new ListIdentityProvidersCommand({ UserPoolId: userPoolId }),
  );
  expect(providers.Providers).toMatchObject([{ ProviderName: 'Google', ProviderType: 'Google' }]);

  await cognitoClient.send(
    new CreateIdentityProviderCommand({
      UserPoolId: userPoolId,
      ProviderName: 'Corporate',
      ProviderType: 'OIDC',
      ProviderDetails: { client_id: 'corporate-client' },
      IdpIdentifiers: ['corp.example.com'],
    }),
  );
  const allProviders = await cognitoClient.send(
    new ListIdentityProvidersCommand({ UserPoolId: userPoolId }),
  );
  expect(allProviders.Providers).toHaveLength(2);
});

// oxlint-disable-next-line complexity
test('domain version and managed login branding are exposed through Cognito APIs', async () => {
  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'domainPool' }));
  const userPoolId = pool.UserPool?.Id;
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: userPoolId, ClientName: 'domainClient' }),
  );
  const clientId = client.UserPoolClient?.ClientId;

  const createdDomain = await cognitoClient.send(
    new CreateUserPoolDomainCommand({
      Domain: 'magnito-test',
      UserPoolId: userPoolId,
      ManagedLoginVersion: 2,
    }),
  );
  expect(createdDomain.ManagedLoginVersion).toBe(2);

  const switchedToClassic = await cognitoClient.send(
    new UpdateUserPoolDomainCommand({
      Domain: 'magnito-test',
      UserPoolId: userPoolId,
      ManagedLoginVersion: 1,
    }),
  );
  expect(switchedToClassic.ManagedLoginVersion).toBe(1);
  const switchedToManaged = await cognitoClient.send(
    new UpdateUserPoolDomainCommand({
      Domain: 'magnito-test',
      UserPoolId: userPoolId,
      ManagedLoginVersion: 2,
    }),
  );
  expect(switchedToManaged.ManagedLoginVersion).toBe(2);

  const domain = await cognitoClient.send(
    new DescribeUserPoolDomainCommand({ Domain: 'magnito-test' }),
  );
  expect(domain.DomainDescription).toMatchObject({
    Domain: 'magnito-test',
    UserPoolId: userPoolId,
    ManagedLoginVersion: 2,
    Status: 'ACTIVE',
  });
  expect(domain.DomainDescription?.CustomDomainConfig).toBeUndefined();

  const createdBranding = await cognitoClient.send(
    new CreateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      UseCognitoProvidedValues: true,
    }),
  );
  expect(createdBranding.ManagedLoginBranding?.ManagedLoginBrandingId).toBeTruthy();

  const branding = await cognitoClient.send(
    new DescribeManagedLoginBrandingByClientCommand({ UserPoolId: userPoolId, ClientId: clientId }),
  );
  expect(branding.ManagedLoginBranding).toMatchObject({
    ManagedLoginBrandingId: createdBranding.ManagedLoginBranding?.ManagedLoginBrandingId,
    UserPoolId: userPoolId,
    UseCognitoProvidedValues: true,
  });

  const otherClient = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: 'customBrandClient',
    }),
  );
  const otherClientId = otherClient.UserPoolClient?.ClientId;
  const plainClient = await cognitoClient.send(
    new DescribeUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: otherClientId,
    }),
  );
  expect(plainClient.UserPoolClient?.ClientSecret).toBeUndefined();
  expect(plainClient.UserPoolClient?.DefaultRedirectURI).toBeUndefined();

  const customBranding = await cognitoClient.send(
    new CreateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ClientId: otherClientId,
      Settings: { components: { form: { color: 'blue' } } },
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
  expect(customBranding.ManagedLoginBranding?.Settings).toMatchObject({
    components: { form: { color: 'blue' } },
  });
  expect(customBranding.ManagedLoginBranding?.Assets?.[0]?.Bytes).toEqual(
    new Uint8Array([1, 2, 3]),
  );
  const brandingId = customBranding.ManagedLoginBranding?.ManagedLoginBrandingId;
  const logoId = customBranding.ManagedLoginBranding?.Assets?.[0]?.ResourceId;
  expect(logoId).toBeTruthy();
  const storedLogo = await prismaClient.managedLoginBrandingAsset.findUnique({
    where: { id: logoId },
  });
  expect(storedLogo?.bytes).toEqual(new Uint8Array([1, 2, 3]));

  const updatedBranding = await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
      Settings: { components: { form: { spacing: 2 } } },
      Assets: [
        {
          Category: 'PAGE_BACKGROUND',
          ColorMode: 'DARK',
          Extension: 'PNG',
          Bytes: new Uint8Array([4, 5]),
        },
      ],
    }),
  );
  expect(updatedBranding.ManagedLoginBranding?.Settings).toMatchObject({
    components: { form: { color: 'blue', spacing: 2 } },
  });
  expect(updatedBranding.ManagedLoginBranding?.Assets).toHaveLength(2);
  expect(updatedBranding.ManagedLoginBranding?.Assets?.[0]?.ResourceId).toBe(logoId);

  const replacedLogo = await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
      Assets: [
        {
          ResourceId: logoId,
          Category: 'FORM_LOGO',
          ColorMode: 'LIGHT',
          Extension: 'PNG',
          Bytes: new Uint8Array([9, 8]),
        },
      ],
    }),
  );
  expect(replacedLogo.ManagedLoginBranding?.Assets?.[0]?.Bytes).toEqual(new Uint8Array([9, 8]));
  expect(replacedLogo.ManagedLoginBranding?.Assets).toHaveLength(2);

  const byId = await cognitoClient.send(
    new DescribeManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
    }),
  );
  expect(byId.ManagedLoginBranding?.Assets?.[0]?.Bytes).toEqual(new Uint8Array([9, 8]));

  const metadataUpdate = await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
      Assets: [
        { Category: 'FORM_LOGO', ColorMode: 'LIGHT', Extension: 'PNG' },
        { Category: 'FORM_LOGO', ColorMode: 'DARK', Extension: 'PNG', Bytes: new Uint8Array([7]) },
        {
          ResourceId: 'reference-only',
          Category: 'PAGE_HEADER_LOGO',
          ColorMode: 'LIGHT',
          Extension: 'PNG',
        },
      ],
    }),
  );
  expect(metadataUpdate.ManagedLoginBranding?.Assets?.[0]?.Bytes).toEqual(new Uint8Array([9, 8]));
  expect(
    metadataUpdate.ManagedLoginBranding?.Assets?.find(
      (asset) => asset.ResourceId === 'reference-only',
    )?.Bytes,
  ).toBeUndefined();
  expect(metadataUpdate.ManagedLoginBranding?.Assets).toHaveLength(4);

  const unchangedBranding = await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
    }),
  );
  expect(unchangedBranding.ManagedLoginBranding?.Assets).toHaveLength(4);

  const reset = await cognitoClient.send(
    new UpdateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
      UseCognitoProvidedValues: true,
    }),
  );
  expect(reset.ManagedLoginBranding?.Assets).toEqual([]);
  expect(reset.ManagedLoginBranding?.Settings).toBeUndefined();

  await cognitoClient.send(
    new DeleteManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ManagedLoginBrandingId: brandingId,
    }),
  );
  await expect(
    cognitoClient.send(
      new DescribeManagedLoginBrandingCommand({
        UserPoolId: userPoolId,
        ManagedLoginBrandingId: brandingId,
      }),
    ),
  ).rejects.toThrow();
  expect(await prismaClient.managedLoginBrandingAsset.count({ where: { brandingId } })).toBe(0);
  const replacementBranding = await cognitoClient.send(
    new CreateManagedLoginBrandingCommand({
      UserPoolId: userPoolId,
      ClientId: otherClientId,
      UseCognitoProvidedValues: true,
    }),
  );
  expect(replacementBranding.ManagedLoginBranding?.ManagedLoginBrandingId).not.toBe(brandingId);

  const missingDomain = await cognitoClient.send(
    new DescribeUserPoolDomainCommand({ Domain: 'no-such-domain' }),
  );
  expect(missingDomain.DomainDescription).toBeUndefined();

  const classic = await cognitoClient.send(
    new CreateUserPoolDomainCommand({
      Domain: 'magnito-classic',
      UserPoolId: userPoolId,
    }),
  );
  expect(classic.ManagedLoginVersion).toBe(1);

  await cognitoClient.send(
    new CreateUserPoolDomainCommand({
      Domain: 'auth.example.com',
      UserPoolId: userPoolId,
      CustomDomainConfig: { CertificateArn: 'arn:aws:acm:us-east-1:000000000000:certificate/test' },
    }),
  );
  const customDomain = await cognitoClient.send(
    new DescribeUserPoolDomainCommand({ Domain: 'auth.example.com' }),
  );
  expect(customDomain.DomainDescription?.CustomDomainConfig?.CertificateArn).toBe(
    'arn:aws:acm:us-east-1:000000000000:certificate/test',
  );

  await cognitoClient.send(
    new UpdateUserPoolDomainCommand({
      Domain: 'auth.example.com',
      UserPoolId: userPoolId,
      CustomDomainConfig: {
        CertificateArn: 'arn:aws:acm:us-east-1:000000000000:certificate/renewed',
      },
    }),
  );
  const updatedCustomDomain = await cognitoClient.send(
    new DescribeUserPoolDomainCommand({ Domain: 'auth.example.com' }),
  );
  expect(updatedCustomDomain.DomainDescription?.CustomDomainConfig?.CertificateArn).toBe(
    'arn:aws:acm:us-east-1:000000000000:certificate/renewed',
  );
  await userPoolConfigUpdateUseCase.updateUserPoolDomain({
    Domain: 'auth.example.com',
    UserPoolId: userPoolId,
    CustomDomainConfig: {
      CertificateArn: 'arn:aws:acm:us-east-1:000000000000:certificate/renewed',
      SecurityPolicy: 'TLS_V1_2_2021',
    } as CustomDomainConfigWithSecurityPolicy,
  });
  const savedCustomDomain = await prismaClient.userPoolDomain.findUnique({
    where: { domain: 'auth.example.com' },
  });
  expect(savedCustomDomain?.securityPolicy).toBe('TLS_V1_2_2021');
  const describedCustomDomain = await userPoolConfigUseCase.describeUserPoolDomain({
    Domain: 'auth.example.com',
  });
  expect(
    (
      describedCustomDomain.DomainDescription?.CustomDomainConfig as
        | CustomDomainConfigWithSecurityPolicy
        | undefined
    )?.SecurityPolicy,
  ).toBe('TLS_V1_2_2021');
  const poolWithDomains = await cognitoClient.send(
    new DescribeUserPoolCommand({ UserPoolId: userPoolId }),
  );
  expect(poolWithDomains.UserPool?.Domain).toBe('magnito-test');
  expect(poolWithDomains.UserPool?.CustomDomain).toBe('auth.example.com');
});

// oxlint-disable-next-line complexity
test('a client cannot be described through another pool', async () => {
  const firstPool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'firstPool' }));
  const secondPool = await cognitoClient.send(
    new CreateUserPoolCommand({ PoolName: 'secondPool' }),
  );
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: firstPool.UserPool?.Id,
      ClientName: 'privateClient',
    }),
  );
  await expect(
    cognitoClient.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: secondPool.UserPool?.Id,
        ClientId: client.UserPoolClient?.ClientId,
      }),
    ),
  ).rejects.toThrow();

  await expect(
    cognitoClient.send(
      new UpdateUserPoolClientCommand({
        UserPoolId: secondPool.UserPool?.Id,
        ClientId: client.UserPoolClient?.ClientId,
        ClientName: 'wrong-pool-update',
      }),
    ),
  ).rejects.toThrow();
  const originalClient = await cognitoClient.send(
    new DescribeUserPoolClientCommand({
      UserPoolId: firstPool.UserPool?.Id,
      ClientId: client.UserPoolClient?.ClientId,
    }),
  );
  expect(originalClient.UserPoolClient?.ClientName).toBe('privateClient');

  await cognitoClient.send(
    new CreateUserPoolDomainCommand({
      Domain: 'first-pool-domain',
      UserPoolId: firstPool.UserPool?.Id,
      ManagedLoginVersion: 2,
    }),
  );
  await expect(
    cognitoClient.send(
      new UpdateUserPoolDomainCommand({
        Domain: 'first-pool-domain',
        UserPoolId: secondPool.UserPool?.Id,
        ManagedLoginVersion: 1,
      }),
    ),
  ).rejects.toThrow();
  const originalDomain = await cognitoClient.send(
    new DescribeUserPoolDomainCommand({ Domain: 'first-pool-domain' }),
  );
  expect(originalDomain.DomainDescription?.ManagedLoginVersion).toBe(2);

  const branding = await cognitoClient.send(
    new CreateManagedLoginBrandingCommand({
      UserPoolId: firstPool.UserPool?.Id,
      ClientId: client.UserPoolClient?.ClientId,
      UseCognitoProvidedValues: true,
    }),
  );
  await expect(
    cognitoClient.send(
      new DeleteManagedLoginBrandingCommand({
        UserPoolId: secondPool.UserPool?.Id,
        ManagedLoginBrandingId: branding.ManagedLoginBranding?.ManagedLoginBrandingId,
      }),
    ),
  ).rejects.toThrow();
  const originalBranding = await cognitoClient.send(
    new DescribeManagedLoginBrandingCommand({
      UserPoolId: firstPool.UserPool?.Id,
      ManagedLoginBrandingId: branding.ManagedLoginBranding?.ManagedLoginBrandingId,
    }),
  );
  expect(originalBranding.ManagedLoginBranding?.ManagedLoginBrandingId).toBe(
    branding.ManagedLoginBranding?.ManagedLoginBrandingId,
  );
});
