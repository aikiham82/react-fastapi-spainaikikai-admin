import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // A leading underscore marks a binding that is deliberately unused,
      // which is how TypeScript already reads unused parameters.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Each feature deliberately exports its context provider alongside its hook;
    // see docs/architecture/frontend-features.md. Fast Refresh cannot verify that
    // pairing, but splitting every feature in two to satisfy a dev-only rule buys
    // nothing at runtime.
    files: ['**/hooks/use*Context.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // shadcn/ui primitives ship their variant helpers next to the component.
    // These files are vendored; keep them close to upstream.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Test helpers and specs: `any` is a legitimate shortcut when standing in for
    // a mock, and these files never ship. Keep unused-variable checking on, since
    // that catches genuinely dead test setup.
    files: [
      'src/test-utils/**/*.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
