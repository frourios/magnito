import { BRANDED_ID_NAMES } from 'common/constants';
import { z } from 'zod';

type IdName = (typeof BRANDED_ID_NAMES)[number];

type Entity<T extends IdName> = string & z.BRAND<`${T}EntityId`>;

type Dto<T extends IdName> = string & z.BRAND<`${T}DtoId`>;

export type EntityId = { [T in IdName]: Entity<T> };

export type DtoId = { [T in IdName]: Dto<T> };

export type MaybeId = { [T in IdName]: Dto<T> | (string & z.BRAND<`${T}MaybeId`>) };

export const brandedId = BRANDED_ID_NAMES.reduce(
  (dict, current) => ({
    ...dict,
    [current]: { entity: z.string(), dto: z.string(), maybe: z.string() },
  }),
  {} as {
    [Name in (typeof BRANDED_ID_NAMES)[number]]: {
      entity: z.ZodType<EntityId[Name]>;
      dto: z.ZodType<DtoId[Name]>;
      maybe: z.ZodType<MaybeId[Name]>;
    };
  },
);
