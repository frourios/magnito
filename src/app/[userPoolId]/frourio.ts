import type { FrourioSpec } from '@frourio/vinext';
import { brandedId } from '../../schemas/brandedId';

export const frourioSpec = {
  param: brandedId.userPool.maybe,
} satisfies FrourioSpec;
