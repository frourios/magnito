/* oxlint-disable max-lines */
import assert from 'assert';
import { randomUUID } from 'crypto';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import type { Prisma, UserPoolClient } from '../../../prisma/client';
import { prismaClient } from '../../../service/prismaClient';
import { transaction } from '../../../service/transaction';
import { toCognitoPolicies } from '../service/poolPolicy';
import { assetData, brandingResponse } from './managedLoginBranding';

// Values in these columns originate from the corresponding typed Cognito requests.
const jsonValue = <T>(value: Prisma.JsonValue | null): T | undefined =>
  value === null ? undefined : (value as T);

// AWS JSON 1.1 transports Date fields as epoch seconds; the SDK deserializes them to Date.
const epochSeconds = (date: Date): Date => (date.getTime() / 1000) as unknown as Date;

// The service accepts SecurityPolicy although the installed SDK type only exposes CertificateArn.
export type CustomDomainConfigWithSecurityPolicy = Cognito.CustomDomainConfigType & {
  SecurityPolicy?: string;
};

export const toCognitoUserPoolClient = (client: UserPoolClient): Cognito.UserPoolClientType => {
  assert(client.name);
  return {
    ClientId: client.id,
    UserPoolId: client.userPoolId,
    ClientName: client.name,
    ClientSecret: client.clientSecret ?? undefined,
    ExplicitAuthFlows: client.explicitAuthFlows as Cognito.ExplicitAuthFlowsType[],
    SupportedIdentityProviders: client.supportedIdentityProviders,
    AllowedOAuthFlows: client.allowedOAuthFlows as Cognito.OAuthFlowType[],
    AllowedOAuthScopes: client.allowedOAuthScopes,
    CallbackURLs: client.callbackUrls,
    LogoutURLs: client.logoutUrls,
    AllowedOAuthFlowsUserPoolClient: client.allowedOAuthFlowsUserPoolClient,
    DefaultRedirectURI: client.defaultRedirectUri ?? undefined,
    CreationDate: epochSeconds(client.createdAt),
    LastModifiedDate: epochSeconds(client.createdAt),
  };
};

export const userPoolConfigUseCase = {
  describeUserPool: async (
    req: Cognito.DescribeUserPoolRequest,
  ): Promise<Cognito.DescribeUserPoolResponse> => {
    assert(req.UserPoolId);
    const pool = await prismaClient.userPool.findUniqueOrThrow({
      where: { id: req.UserPoolId },
      include: { domains: { orderBy: { createdAt: 'asc' } } },
    });
    assert(pool.name);
    return {
      UserPool: {
        Id: pool.id,
        Name: pool.name,
        Domain: pool.domains.find((domain) => !domain.domain.includes('.'))?.domain,
        CustomDomain: pool.domains.find((domain) => domain.domain.includes('.'))?.domain,
        Policies: toCognitoPolicies(pool),
        MfaConfiguration: pool.mfaConfiguration as Cognito.UserPoolMfaType,
        UsernameAttributes: pool.usernameAttributes as Cognito.UsernameAttributeType[],
        AliasAttributes: pool.aliasAttributes as Cognito.AliasAttributeType[],
        AutoVerifiedAttributes: pool.autoVerifiedAttributes as Cognito.VerifiedAttributeType[],
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: pool.adminCreateUserOnly },
        CreationDate: epochSeconds(pool.createdAt),
        LastModifiedDate: epochSeconds(pool.createdAt),
      },
    };
  },
  describeUserPoolClient: async (
    req: Cognito.DescribeUserPoolClientRequest,
  ): Promise<Cognito.DescribeUserPoolClientResponse> => {
    assert(req.UserPoolId);
    assert(req.ClientId);
    const client = await prismaClient.userPoolClient.findFirstOrThrow({
      where: { id: req.ClientId, userPoolId: req.UserPoolId },
    });
    return { UserPoolClient: toCognitoUserPoolClient(client) };
  },
  createIdentityProvider: async (
    req: Cognito.CreateIdentityProviderRequest,
  ): Promise<Cognito.CreateIdentityProviderResponse> => {
    assert(req.UserPoolId);
    assert(req.ProviderName);
    assert(req.ProviderType);
    assert(req.ProviderDetails);
    const userPoolId = req.UserPoolId;
    const providerName = req.ProviderName;
    const providerType = req.ProviderType;
    const providerDetails = req.ProviderDetails;
    const provider = await transaction('RepeatableRead', async (tx) => {
      await tx.userPool.findUniqueOrThrow({ where: { id: userPoolId } });
      const now = new Date();
      return tx.identityProvider.create({
        data: {
          userPoolId,
          providerName,
          providerType,
          providerDetails,
          attributeMapping: req.AttributeMapping,
          idpIdentifiers: req.IdpIdentifiers ?? [],
          createdAt: now,
          updatedAt: now,
        },
      });
    });
    return {
      IdentityProvider: {
        UserPoolId: provider.userPoolId,
        ProviderName: provider.providerName,
        ProviderType: provider.providerType as Cognito.IdentityProviderTypeType,
        ProviderDetails: jsonValue(provider.providerDetails),
        AttributeMapping: jsonValue(provider.attributeMapping),
        IdpIdentifiers: provider.idpIdentifiers,
        CreationDate: epochSeconds(provider.createdAt),
        LastModifiedDate: epochSeconds(provider.updatedAt),
      },
    };
  },
  listIdentityProviders: async (
    req: Cognito.ListIdentityProvidersRequest,
  ): Promise<Cognito.ListIdentityProvidersResponse> => {
    assert(req.UserPoolId);
    await prismaClient.userPool.findUniqueOrThrow({ where: { id: req.UserPoolId } });
    const providers = await prismaClient.identityProvider.findMany({
      where: { userPoolId: req.UserPoolId },
      orderBy: { providerName: 'asc' },
      take: req.MaxResults,
    });
    return {
      Providers: providers.map((provider) => ({
        ProviderName: provider.providerName,
        ProviderType: provider.providerType as Cognito.IdentityProviderTypeType,
        CreationDate: epochSeconds(provider.createdAt),
        LastModifiedDate: epochSeconds(provider.updatedAt),
      })),
    };
  },
  describeIdentityProvider: async (
    req: Cognito.DescribeIdentityProviderRequest,
  ): Promise<Cognito.DescribeIdentityProviderResponse> => {
    assert(req.UserPoolId);
    assert(req.ProviderName);
    const provider = await prismaClient.identityProvider.findUniqueOrThrow({
      where: {
        userPoolId_providerName: { userPoolId: req.UserPoolId, providerName: req.ProviderName },
      },
    });
    return {
      IdentityProvider: {
        UserPoolId: provider.userPoolId,
        ProviderName: provider.providerName,
        ProviderType: provider.providerType as Cognito.IdentityProviderTypeType,
        ProviderDetails: jsonValue(provider.providerDetails),
        AttributeMapping: jsonValue(provider.attributeMapping),
        IdpIdentifiers: provider.idpIdentifiers,
        CreationDate: epochSeconds(provider.createdAt),
        LastModifiedDate: epochSeconds(provider.updatedAt),
      },
    };
  },
  createUserPoolDomain: async (
    req: Cognito.CreateUserPoolDomainRequest,
  ): Promise<Cognito.CreateUserPoolDomainResponse> => {
    assert(req.Domain);
    assert(req.UserPoolId);
    assert(
      req.ManagedLoginVersion === undefined ||
        req.ManagedLoginVersion === 1 ||
        req.ManagedLoginVersion === 2,
    );
    const userPoolId = req.UserPoolId;
    const domainName = req.Domain;
    const config = req.CustomDomainConfig as CustomDomainConfigWithSecurityPolicy | undefined;
    const domain = await transaction('RepeatableRead', async (tx) => {
      await tx.userPool.findUniqueOrThrow({ where: { id: userPoolId } });
      return tx.userPoolDomain.create({
        data: {
          domain: domainName,
          userPoolId,
          managedLoginVersion: req.ManagedLoginVersion ?? 1,
          certificateArn: config?.CertificateArn,
          securityPolicy: config?.SecurityPolicy,
          createdAt: new Date(),
        },
      });
    });
    return { ManagedLoginVersion: domain.managedLoginVersion };
  },
  describeUserPoolDomain: async (
    req: Cognito.DescribeUserPoolDomainRequest,
  ): Promise<Cognito.DescribeUserPoolDomainResponse> => {
    assert(req.Domain);
    const domain = await prismaClient.userPoolDomain.findUnique({ where: { domain: req.Domain } });
    return {
      DomainDescription: domain
        ? {
            Domain: domain.domain,
            UserPoolId: domain.userPoolId,
            ManagedLoginVersion: domain.managedLoginVersion,
            CustomDomainConfig: domain.certificateArn
              ? ({
                  CertificateArn: domain.certificateArn,
                  SecurityPolicy: domain.securityPolicy ?? undefined,
                } as CustomDomainConfigWithSecurityPolicy)
              : undefined,
            Status: 'ACTIVE',
          }
        : undefined,
    };
  },
  createManagedLoginBranding: async (
    req: Cognito.CreateManagedLoginBrandingRequest,
  ): Promise<Cognito.CreateManagedLoginBrandingResponse> => {
    assert(req.UserPoolId);
    assert(req.ClientId);
    assert(!req.UseCognitoProvidedValues || (!req.Settings && !req.Assets));
    const userPoolId = req.UserPoolId;
    const clientId = req.ClientId;
    return transaction('RepeatableRead', async (tx) => {
      await tx.userPoolClient.findFirstOrThrow({ where: { id: clientId, userPoolId } });
      const now = new Date();
      await tx.managedLoginBranding.create({
        data: {
          id: randomUUID(),
          userPoolId,
          clientId,
          useCognitoProvidedValues: req.UseCognitoProvidedValues ?? false,
          settings: req.Settings as Prisma.InputJsonValue | undefined,
          assets: { create: req.Assets?.map(assetData) ?? [] },
          createdAt: now,
          updatedAt: now,
        },
      });
      const branding = await tx.managedLoginBranding.findUniqueOrThrow({
        where: { clientId },
        include: { assets: { orderBy: { position: 'asc' } } },
      });
      return { ManagedLoginBranding: brandingResponse(branding) };
    });
  },
  describeManagedLoginBrandingByClient: async (
    req: Cognito.DescribeManagedLoginBrandingByClientRequest,
  ): Promise<Cognito.DescribeManagedLoginBrandingByClientResponse> => {
    assert(req.UserPoolId);
    assert(req.ClientId);
    const branding = await prismaClient.managedLoginBranding.findFirstOrThrow({
      where: { userPoolId: req.UserPoolId, clientId: req.ClientId },
      include: { assets: { orderBy: { position: 'asc' } } },
    });
    return { ManagedLoginBranding: brandingResponse(branding, req.ReturnMergedResources) };
  },
  describeManagedLoginBranding: async (
    req: Cognito.DescribeManagedLoginBrandingRequest,
  ): Promise<Cognito.DescribeManagedLoginBrandingResponse> => {
    assert(req.UserPoolId && req.ManagedLoginBrandingId);
    const branding = await prismaClient.managedLoginBranding.findFirstOrThrow({
      where: { id: req.ManagedLoginBrandingId, userPoolId: req.UserPoolId },
      include: { assets: { orderBy: { position: 'asc' } } },
    });
    return { ManagedLoginBranding: brandingResponse(branding, req.ReturnMergedResources) };
  },
};
