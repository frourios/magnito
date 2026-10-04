/* oxlint-disable max-lines */
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import type { Terms, TermsLink } from '../../../prisma/client';
import { cognitoAssert } from '../../../service/cognitoAssert';
import { prismaClient } from '../../../service/prismaClient';
import { transaction } from '../../../service/transaction';

const languages = new Set([
  'default',
  'dutch',
  'english',
  'french',
  'spanish',
  'german',
  'bahasa-indonesia',
  'italian',
  'japanese',
  'korean',
  'portuguese-brazil',
  'chinese-simplified',
  'chinese-traditional',
]);

// oxlint-disable-next-line complexity
const validateLinks = (links: Record<string, string> | undefined): void => {
  if (links === undefined) return;
  cognitoAssert(Object.keys(links).length <= 13, 'Invalid terms document.');
  for (const [language, link] of Object.entries(links)) {
    cognitoAssert(
      languages.has(language.replace(/^cognito:/, '')) && language.startsWith('cognito:'),
      'Invalid terms document.',
    );
    cognitoAssert(
      typeof link === 'string' && link.length > 0 && link.length <= 1024,
      'Invalid terms document.',
    );
    try {
      const url = new URL(link);
      cognitoAssert(
        url.protocol === 'https:' || url.protocol === 'http:',
        'Invalid terms document.',
      );
    } catch {
      cognitoAssert(false, 'Invalid terms document.');
    }
  }
};

const validateFields = (
  name: string | undefined,
  source: string | undefined,
  enforcement: string | undefined,
): void => {
  cognitoAssert(name === 'terms-of-use' || name === 'privacy-policy', 'Invalid terms document.');
  cognitoAssert(source === 'LINK' && enforcement === 'NONE', 'Invalid terms document.');
};

const epochSeconds = (date: Date): Date => (date.getTime() / 1000) as unknown as Date;

const toTerms = (terms: Terms & { links: TermsLink[] }): Cognito.TermsType => ({
  TermsId: terms.id,
  UserPoolId: terms.userPoolId,
  ClientId: terms.clientId,
  TermsName: terms.name,
  TermsSource: terms.source as Cognito.TermsSourceType,
  Enforcement: terms.enforcement as Cognito.TermsEnforcementType,
  Links: Object.fromEntries(terms.links.map((link) => [link.language, link.url])),
  CreationDate: epochSeconds(terms.createdAt),
  LastModifiedDate: epochSeconds(terms.updatedAt),
});

const findTerms = (
  userPoolId: string,
  id: string,
): Promise<(Terms & { links: TermsLink[] }) | null> =>
  prismaClient.terms.findFirst({
    where: { id, userPoolId },
    include: { links: true },
  });

export const termsUseCase = {
  create: async (req: Cognito.CreateTermsRequest): Promise<Cognito.CreateTermsResponse> => {
    assert(req.UserPoolId && req.ClientId);
    validateFields(req.TermsName, req.TermsSource, req.Enforcement);
    validateLinks(req.Links);
    const { UserPoolId: userPoolId, ClientId: clientId, TermsName: name } = req;
    const links = req.Links ?? {};
    assert(name);
    const terms = await transaction('Serializable', async (tx) => {
      const client = await tx.userPoolClient.findFirst({ where: { id: clientId, userPoolId } });
      cognitoAssert(client, 'Terms not found.');
      const existing = await tx.terms.findFirst({ where: { clientId, name } });
      cognitoAssert(!existing, 'Terms already exist.');
      const now = new Date();
      return tx.terms.create({
        data: {
          id: randomUUID(),
          userPoolId,
          clientId,
          name,
          source: 'LINK',
          enforcement: 'NONE',
          createdAt: now,
          updatedAt: now,
          links: { create: Object.entries(links).map(([language, url]) => ({ language, url })) },
        },
        include: { links: true },
      });
    });
    return { Terms: toTerms(terms) };
  },
  describe: async (req: Cognito.DescribeTermsRequest): Promise<Cognito.DescribeTermsResponse> => {
    assert(req.UserPoolId && req.TermsId);
    const terms = await findTerms(req.UserPoolId, req.TermsId);
    cognitoAssert(terms, 'Terms not found.');
    return { Terms: toTerms(terms) };
  },
  // oxlint-disable-next-line complexity
  list: async (req: Cognito.ListTermsRequest): Promise<Cognito.ListTermsResponse> => {
    assert(req.UserPoolId);
    cognitoAssert(
      req.MaxResults === undefined ||
        (Number.isInteger(req.MaxResults) && req.MaxResults >= 1 && req.MaxResults <= 60),
      'Invalid terms document.',
    );
    cognitoAssert(
      !req.NextToken || /^[A-Za-z0-9_-]+$/.test(req.NextToken),
      'Invalid terms pagination token.',
    );
    const decoded = req.NextToken ? Buffer.from(req.NextToken, 'base64url').toString() : '0';
    cognitoAssert(/^(0|[1-9]\d*)$/.test(decoded), 'Invalid terms pagination token.');
    const offset = Number(decoded);
    cognitoAssert(Number.isSafeInteger(offset) && offset >= 0, 'Invalid terms pagination token.');
    const pool = await prismaClient.userPool.findUnique({ where: { id: req.UserPoolId } });
    cognitoAssert(pool, 'Terms not found.');
    const limit = req.MaxResults ?? 60;
    const terms = await prismaClient.terms.findMany({
      where: { userPoolId: req.UserPoolId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
    });
    return {
      Terms: terms.slice(0, limit).map((term) => ({
        TermsId: term.id,
        TermsName: term.name,
        Enforcement: term.enforcement as Cognito.TermsEnforcementType,
        CreationDate: epochSeconds(term.createdAt),
        LastModifiedDate: epochSeconds(term.updatedAt),
      })),
      NextToken:
        terms.length > limit
          ? Buffer.from(String(offset + limit)).toString('base64url')
          : undefined,
    };
  },
  // oxlint-disable-next-line complexity
  update: async (req: Cognito.UpdateTermsRequest): Promise<Cognito.UpdateTermsResponse> => {
    assert(req.UserPoolId && req.TermsId);
    const existing = await findTerms(req.UserPoolId, req.TermsId);
    cognitoAssert(existing, 'Terms not found.');
    validateFields(
      req.TermsName ?? existing.name,
      req.TermsSource ?? existing.source,
      req.Enforcement ?? existing.enforcement,
    );
    if (req.Links !== undefined) validateLinks(req.Links);
    const terms = await transaction('Serializable', async (tx) => {
      if (req.TermsName && req.TermsName !== existing.name) {
        const duplicate = await tx.terms.findFirst({
          where: { clientId: existing.clientId, name: req.TermsName },
        });
        cognitoAssert(!duplicate, 'Terms already exist.');
      }
      if (req.Links !== undefined)
        await tx.termsLink.deleteMany({ where: { termsId: existing.id } });
      return tx.terms.update({
        where: { id: existing.id },
        data: {
          name: req.TermsName,
          updatedAt: new Date(),
          ...(req.Links !== undefined
            ? {
                links: {
                  create: Object.entries(req.Links).map(([language, url]) => ({ language, url })),
                },
              }
            : {}),
        },
        include: { links: true },
      });
    });
    return { Terms: toTerms(terms) };
  },
  delete: async (req: Cognito.DeleteTermsRequest): Promise<Record<string, never>> => {
    assert(req.UserPoolId && req.TermsId);
    const terms = await findTerms(req.UserPoolId, req.TermsId);
    cognitoAssert(terms, 'Terms not found.');
    await prismaClient.terms.delete({ where: { id: terms.id } });
    return {};
  },
};
