import assert from 'assert';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from 'server/prisma/client';
import { ulid } from 'ulid';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('server/service/prismaClient', async () => {
  assert(process.env.DATABASE_URL);

  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/[^/]+$/, `test-${ulid()}`);

  return {
    prismaClient: new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
    }),
  };
});

import { spawn } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { http, passthrough } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import { userPoolUseCase } from 'server/domain/userPool/useCase/userPoolUseCase';
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

afterAll(() => {
  server.close();

  const dbFileName = readdirSync('./data').find((file) => process.env.DATABASE_URL?.endsWith(file));

  assert(dbFileName);
  unlinkSync(path.join('./data', dbFileName));
});
