import js from '@eslint/js';
import gitignore from 'eslint-config-flat-gitignore';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { files: ['**/*.(ts,js,tsx)'] },
  gitignore(),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      eqeqeq: 'error',
      'no-param-reassign': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      complexity: ['error', 5],
      'max-depth': ['error', 2],
      'max-nested-callbacks': ['error', 3],
      'max-lines': ['error', 200],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['*.tsx'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['server/**/*.ts'],
    rules: { '@typescript-eslint/explicit-function-return-type': ['error'] },
  },
  {
    files: ['server/api/**/controller.ts', 'server/api/**/hooks.ts'],
    rules: { '@typescript-eslint/explicit-function-return-type': ['off'] },
  },
  {
    files: ['**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': ['off'] },
  },
  { files: ['server/tests/**/*.ts'], rules: { 'max-lines': 'off' } },
  { files: ['client/next.config.ts'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  prettierConfig,
);
