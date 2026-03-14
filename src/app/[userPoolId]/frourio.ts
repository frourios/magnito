import type { FrourioSpec } from '@frourio/next';
import { brandedId } from 'src/schemas/brandedId';

export const frourioSpec = {
  param: brandedId.userPool.maybe,
} satisfies FrourioSpec;
