import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/', '.astro/', 'node_modules/', '*.config.*'],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  tseslint.configs.recommended,

  // Astro recommended rules
  ...eslintPluginAstro.configs['flat/recommended'],

  // React — recommended + JSX runtime (no import React needed)
  {
    files: ['**/*.{jsx,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // React Hooks
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs['recommended-latest'].rules,
  },

  // Prettier — must be last, disables conflicting formatting rules
  eslintConfigPrettier,
);
