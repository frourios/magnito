import { PROVIDER_LIST } from '../../../../src/schemas/constants';
/* oxlint-disable complexity */
import { prismaClient } from '../../../service/prismaClient';
import { mergeSettings } from '../useCase/managedLoginBranding';
import defaultSettings from '../useCase/managedLoginDefaultSettings.json';

export type ManagedLoginConfig = {
  clientId: string;
  poolName: string;
  allowPassword: boolean;
  allowSignUp: boolean;
  providers: string[];
  settings: typeof defaultSettings;
  assets: { category: string; url: string }[];
};

// oxlint-disable-next-line complexity
export const loadManagedLoginConfig = async (
  clientId: string,
  hostname?: string,
): Promise<ManagedLoginConfig | null> => {
  const client = await prismaClient.userPoolClient.findUnique({
    where: { id: clientId },
    include: {
      UserPool: { include: { identityProviders: true, domains: true } },
      managedLoginBranding: { include: { assets: { orderBy: { position: 'asc' } } } },
    },
  });
  if (!client?.allowedOAuthFlowsUserPoolClient || !client.allowedOAuthFlows.includes('code')) {
    return null;
  }
  const domains = client.UserPool.domains;
  const domain = hostname
    ? (domains.find(
        (item) =>
          hostname === item.domain ||
          (!item.domain.includes('.') && hostname.startsWith(`${item.domain}.auth.`)),
      ) ?? (domains.length === 1 ? domains[0] : undefined))
    : domains.find((item) => item.managedLoginVersion === 2);
  if (domain?.managedLoginVersion !== 2) return null;

  const branding = client.managedLoginBranding;
  const settings = mergeSettings(
    defaultSettings,
    branding?.settings ?? {},
  ) as typeof defaultSettings;
  const providers = client.UserPool.identityProviders
    .filter(
      (provider) =>
        client.supportedIdentityProviders.includes(provider.providerName) &&
        PROVIDER_LIST.includes(provider.providerName as (typeof PROVIDER_LIST)[number]),
    )
    .map((provider) => provider.providerName);

  return {
    clientId,
    poolName: client.UserPool.name ?? 'Sign in',
    allowPassword:
      client.supportedIdentityProviders.includes('COGNITO') &&
      client.UserPool.allowedFirstAuthFactors.includes('PASSWORD'),
    allowSignUp: !client.UserPool.adminCreateUserOnly,
    providers,
    settings,
    assets: (branding?.assets ?? [])
      .filter(
        (asset) => asset.bytes && asset.colorMode === settings.categories.global.colorSchemeMode,
      )
      .map((asset) => ({
        category: asset.category,
        url: `data:image/${asset.extension === 'SVG' ? 'svg+xml' : asset.extension === 'JPG' ? 'jpeg' : asset.extension.toLowerCase()};base64,${Buffer.from(asset.bytes as Uint8Array).toString('base64')}`,
      })),
  };
};

export const validateManagedLoginRequest = async (input: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  hostname?: string;
}): Promise<ManagedLoginConfig | null> => {
  const config = await loadManagedLoginConfig(input.clientId, input.hostname);
  if (!config) return null;
  const client = await prismaClient.userPoolClient.findUniqueOrThrow({
    where: { id: input.clientId },
  });
  if (!client.callbackUrls.includes(input.redirectUri)) return null;
  const scopes = input.scope?.split(/\s+/).filter(Boolean) ?? [];
  if (scopes.some((scope) => !client.allowedOAuthScopes.includes(scope))) return null;
  return config;
};
