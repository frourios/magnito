import assert from 'assert';
import { randomUUID } from 'crypto';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import type { Prisma } from '../../../prisma/client';
// AWS doesn't publish a versioned defaults document. This baseline follows its API example.
// https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateManagedLoginBranding.html
import defaultSettings from './managedLoginDefaultSettings.json';

type BrandingWithAssets = Prisma.ManagedLoginBrandingGetPayload<{ include: { assets: true } }>;
type AssetData = {
  id: string;
  category: Cognito.AssetCategoryType;
  colorMode: Cognito.ColorSchemeModeType;
  extension: Cognito.AssetExtensionType;
  bytes: Uint8Array<ArrayBuffer> | null;
  position: number;
};

// AWS JSON 1.1 sends blob fields as base64 strings on the wire.
export const assetData = (asset: Cognito.AssetType, position: number): AssetData => {
  assert(asset.Category && asset.ColorMode && asset.Extension);
  return {
    id: asset.ResourceId ?? randomUUID().replaceAll('-', ''),
    category: asset.Category,
    colorMode: asset.ColorMode,
    extension: asset.Extension,
    bytes:
      asset.Bytes === undefined
        ? null
        : new Uint8Array(Buffer.from(asset.Bytes as unknown as string, 'base64')),
    position,
  };
};

export const brandingResponse = (
  branding: BrandingWithAssets,
  returnMergedResources = false,
): Cognito.ManagedLoginBrandingType => ({
  ManagedLoginBrandingId: branding.id,
  UserPoolId: branding.userPoolId,
  UseCognitoProvidedValues: branding.useCognitoProvidedValues,
  Settings: returnMergedResources
    ? (mergeSettings(
        defaultSettings,
        branding.settings ?? {},
      ) as Cognito.ManagedLoginBrandingType['Settings'])
    : branding.settings === null
      ? undefined
      : (branding.settings as Cognito.ManagedLoginBrandingType['Settings']),
  Assets: branding.assets.map((asset) => ({
    ResourceId: asset.id,
    Category: asset.category as Cognito.AssetCategoryType,
    ColorMode: asset.colorMode as Cognito.ColorSchemeModeType,
    Extension: asset.extension as Cognito.AssetExtensionType,
    Bytes:
      asset.bytes === null
        ? undefined
        : (Buffer.from(asset.bytes).toString('base64') as unknown as Uint8Array),
  })),
  CreationDate: (branding.createdAt.getTime() / 1000) as unknown as Date,
  LastModifiedDate: (branding.updatedAt.getTime() / 1000) as unknown as Date,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Cognito's branding updates preserve unspecified values, including nested settings.
export const mergeSettings = (current: unknown, update: unknown): Prisma.InputJsonValue => {
  if (!isObject(current) || !isObject(update)) return update as Prisma.InputJsonValue;

  const merged: Record<string, Prisma.InputJsonValue> = { ...current } as Record<
    string,
    Prisma.InputJsonValue
  >;
  for (const [key, value] of Object.entries(update)) {
    merged[key] = mergeSettings(current[key], value);
  }
  return merged;
};
