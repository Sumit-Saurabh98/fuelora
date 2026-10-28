// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

// Machine-checked versions of the AGENTS.md layer and time rules.
const noDateNow = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Inject Clock instead of new Date() (AGENTS.md rule 6).',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Inject Clock instead of Date.now() (AGENTS.md rule 6).',
  },
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'web/*', 'store/**', 'src/db/migrations/*'],
  },
  {
    // Node build scripts and Expo config plugins (CommonJS).
    files: ['scripts/**/*.js', 'plugins/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        process: 'readonly',
        module: 'writable',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Hermes on iOS crashes on these (seen on device 2026-10-28); use Intl format() output.
      'no-restricted-properties': [
        'error',
        { property: 'formatToParts', message: 'Not available in Hermes on iOS; parse format().' },
        { property: 'resolvedOptions', message: 'Unreliable in Hermes on iOS; parse format().' },
      ],
      // Invisible NBSPs in source are a trap (Intl output uses them); write \u00a0 instead.
      'no-irregular-whitespace': [
        'error',
        { skipStrings: false, skipTemplates: false, skipRegExps: false, skipComments: false },
      ],
    },
  },
  {
    files: ['app/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/db', '@/db/*', '**/src/db/*'],
              message: 'Screens never import src/db (AGENTS.md rule 11).',
            },
            {
              group: ['@/repositories', '@/repositories/*'],
              message: 'Screens go through hooks and services (AGENTS.md rule 11).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'expo',
                'expo-*',
                '@expo/*',
                'drizzle-orm',
                'drizzle-orm/*',
              ],
              message: 'src/domain is pure TypeScript.',
            },
          ],
        },
      ],
      'no-restricted-syntax': ['error', ...noDateNow],
    },
  },
  {
    files: ['src/services/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noDateNow],
    },
  },
  {
    files: ['**/__tests__/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
