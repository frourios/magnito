import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import 'dotenv/config';

export default defineConfig({
  plugins: [react()],
  test: {
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
    setupFiles: ['tests/setup.ts'],
    coverage: {
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
      include: ['src/app/**/route.ts', 'server/domain/**'],
    },
  },
});
