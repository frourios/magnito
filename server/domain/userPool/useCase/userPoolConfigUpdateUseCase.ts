import assert from 'assert';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import { Prisma } from '../../../prisma/client';
import { prismaClient } from '../../../service/prismaClient';
import { transaction } from '../../../service/transaction';
import { poolPolicyData } from '../service/poolPolicy';
import { assetData, brandingResponse, mergeSettings } from './managedLoginBranding';
import {
  toCognitoUserPoolClient,
  type CustomDomainConfigWithSecurityPolicy,
} from './userPoolConfigUseCase';

export const userPoolConfigUpdateUseCase = {
  updateUserPool: async (
    req: Cognito.UpdateUserPoolRequest,
  ): Promise<Cognito.UpdateUserPoolResponse> => {
    assert(req.UserPoolId);
    await prismaClient.userPool.update({
      where: { id: req.UserPoolId },
      data: { ...poolPolicyData(req.Policies) },
    });
    return {};
  },
  updateUserPoolClient: async (
    req: Cognito.UpdateUserPoolClientRequest,
  ): Promise<Cognito.UpdateUserPoolClientResponse> => {
    assert(req.UserPoolId && req.ClientId);
    const client = await prismaClient.userPoolClient.update({
      where: { id: req.ClientId, userPoolId: req.UserPoolId },
      data: {
        name: req.ClientName,
        explicitAuthFlows: req.ExplicitAuthFlows,
        supportedIdentityProviders: req.SupportedIdentityProviders,
        allowedOAuthFlows: req.AllowedOAuthFlows,
        allowedOAuthScopes: req.AllowedOAuthScopes,
        callbackUrls: req.CallbackURLs,
        logoutUrls: req.LogoutURLs,
        allowedOAuthFlowsUserPoolClient: req.AllowedOAuthFlowsUserPoolClient,
        defaultRedirectUri: req.DefaultRedirectURI,
      },
    });
    return { UserPoolClient: toCognitoUserPoolClient(client) };
  },
  // oxlint-disable-next-line complexity
  updateUserPoolDomain: async (
    req: Cognito.UpdateUserPoolDomainRequest,
  ): Promise<Cognito.UpdateUserPoolDomainResponse> => {
    assert(req.Domain && req.UserPoolId);
    const config = req.CustomDomainConfig as CustomDomainConfigWithSecurityPolicy | undefined;
    assert(
      req.ManagedLoginVersion === undefined ||
        req.ManagedLoginVersion === 1 ||
        req.ManagedLoginVersion === 2,
    );
    const domain = await prismaClient.userPoolDomain.update({
      where: { domain: req.Domain, userPoolId: req.UserPoolId },
      data: {
        managedLoginVersion: req.ManagedLoginVersion,
        certificateArn: config?.CertificateArn,
        securityPolicy: config?.SecurityPolicy,
      },
    });
    return { ManagedLoginVersion: domain.managedLoginVersion };
  },
  updateManagedLoginBranding: async (
    req: Cognito.UpdateManagedLoginBrandingRequest,
  ): Promise<Cognito.UpdateManagedLoginBrandingResponse> => {
    assert(req.UserPoolId && req.ManagedLoginBrandingId);
    assert(!req.UseCognitoProvidedValues || (!req.Settings && !req.Assets));
    // oxlint-disable-next-line complexity
    return transaction('RepeatableRead', async (tx) => {
      const current = await tx.managedLoginBranding.findFirstOrThrow({
        where: { id: req.ManagedLoginBrandingId, userPoolId: req.UserPoolId },
        include: { assets: true },
      });

      if (req.UseCognitoProvidedValues) {
        await tx.managedLoginBrandingAsset.deleteMany({ where: { brandingId: current.id } });
      }

      for (const [index, asset] of (req.Assets ?? []).entries()) {
        const matching = asset.ResourceId
          ? current.assets.find((stored) => stored.id === asset.ResourceId)
          : current.assets.find(
              (stored) =>
                stored.category === asset.Category && stored.colorMode === asset.ColorMode,
            );
        const data = assetData(asset, matching?.position ?? current.assets.length + index);
        if (matching) {
          await tx.managedLoginBrandingAsset.update({
            where: { id: matching.id },
            data: {
              category: data.category,
              colorMode: data.colorMode,
              extension: data.extension,
              bytes: asset.Bytes === undefined ? undefined : data.bytes,
            },
          });
        } else {
          await tx.managedLoginBrandingAsset.create({
            data: { ...data, brandingId: current.id },
          });
        }
      }

      const branding = await tx.managedLoginBranding.update({
        where: { id: current.id },
        data: {
          useCognitoProvidedValues:
            req.UseCognitoProvidedValues ??
            (req.Settings !== undefined || req.Assets !== undefined ? false : undefined),
          settings: req.UseCognitoProvidedValues
            ? Prisma.DbNull
            : req.Settings === undefined
              ? undefined
              : mergeSettings(current.settings, req.Settings),
          updatedAt: new Date(),
        },
        include: { assets: { orderBy: { position: 'asc' } } },
      });
      return { ManagedLoginBranding: brandingResponse(branding) };
    });
  },
  deleteManagedLoginBranding: async (
    req: Cognito.DeleteManagedLoginBrandingRequest,
  ): Promise<Record<string, never>> => {
    assert(req.UserPoolId && req.ManagedLoginBrandingId);
    await prismaClient.managedLoginBranding.delete({
      where: { id: req.ManagedLoginBrandingId, userPoolId: req.UserPoolId },
    });
    return {};
  },
};
