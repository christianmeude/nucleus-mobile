// Flat ESLint config (ESLint 9). Expo's shared rules, with eslint-config-prettier
// last so formatting rules never fight Prettier. Config files and build output
// are ignored so lint stays scoped to app source.
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      // Supabase Edge Functions are Deno (Deno.*/Supabase.ai globals + remote
      // AI Agent skills (these contain Node/Deno scripts not part of the RN app)
      '.agents/**',
      '.github/**',
      '.impeccable/**',
      'supabase/**',
      'babel.config.js',
      'jest.config.js',
      'eslint.config.js',
    ],
  },
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  eslintConfigPrettier,
  {
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    // Initial adoption baseline: keep lint green on the existing codebase, then
    // ratchet these back up as debt is cleaned. See docs/CONVENTIONS.md.
    rules: {
      // Treat "_"-prefixed identifiers (e.g. `catch (_error)`) as intentional.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // React Compiler-adjacent rules new in eslint-config-expo 57. They fire on
      // idiomatic RN animation/ref patterns (incl. Reanimated shared-value
      // `.value` mutation) and on frozen files we cannot edit, so surface them
      // as warnings for now rather than blocking every PR.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
];
