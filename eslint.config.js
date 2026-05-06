// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      '**/dist/**',
      '**/.expo/**',
      '**/.venv/**',
      '**/autoposter-backend/**',
      '**/scripts/**',
    ],
    rules: {
      'react/no-unescaped-entities': 'warn',
      'no-dupe-keys': 'warn',
    },
  },
]);
