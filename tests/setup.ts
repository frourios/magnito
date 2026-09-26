import assert from 'assert';
import { PrismaPg } from '@prisma/adapter-pg';
import { ulid } from 'ulid';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '../server/prisma/client';
import 'dotenv/config';

vi.mock('../server/service/prismaClient', async () => {
  process.env.DATABASE_URL = `postgresql://root:root@localhost:6430/test-${ulid()}`;

  return {
    prismaClient: new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    }),
  };
});

vi.mock('../server/service/serverEnvs', async (importOriginal) => {
  const actual = await importOriginal<Record<string, string>>();

  process.env.SMTP_PORT = '3500';
  process.env.INBUCKET_URL = 'http://localhost:3501';

  return { ...actual, SMTP_PORT: process.env.SMTP_PORT };
});

import { spawn } from 'child_process';
import { http, passthrough } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import { userPoolUseCase } from '../server/domain/userPool/useCase/userPoolUseCase';
import { prismaClient } from '../server/service/prismaClient';
import { setupMswHandlers } from './setupMswHandlers';

let server: SetupServerApi;

const TEST_ENV_NAMES = [
  'PORT',
  'INBUCKET_URL',
  'COGNITO_USER_POOL_CLIENT_ID',
  'COGNITO_USER_POOL_ID',
] as const;

type TestEnvs = Record<(typeof TEST_ENV_NAMES)[number], string | undefined>;

function testEnvs(): TestEnvs {
  return TEST_ENV_NAMES.reduce(
    (dict, name) => ({ ...dict, [name]: process.env[name] }),
    {} as TestEnvs,
  );
}

beforeAll(() => {
  server = setupServer(
    http.all(`${testEnvs().INBUCKET_URL}/*`, passthrough),
    ...setupMswHandlers({ baseURL: `http://localhost:${testEnvs().PORT}` }),
  );

  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const { CLAUDECODE: _, ...envWithoutClaude } = process.env;
    const proc = spawn('npx', ['prisma', 'migrate', 'reset', '--force'], {
      // stdio: 'inherit',
      env: envWithoutClaude,
    });

    proc.once('close', resolve);
    proc.once('error', reject);
  });

  await userPoolUseCase.initDefaults();
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  server.close();
  await prismaClient.$disconnect();

  assert(process.env.DATABASE_URL);
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const databaseName = databaseUrl.pathname.slice(1);

  databaseUrl.pathname = '/postgres';
  const adminClient = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl.toString() }),
  });

  await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminClient.$disconnect();
}, 30_000);
