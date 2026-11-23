import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'tests/generated'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'Hard waits are banned. Use web-first assertions or expect.poll.',
        },
      ],
    },
  },
  { files: ['scripts/**', 'reporters/**', 'src/core/logger.ts'], rules: { 'no-console': 'off' } },
);
