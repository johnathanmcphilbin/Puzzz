import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tailwindcss from 'eslint-plugin-tailwindcss';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'supabase/.temp/**',
      '*.config.js',
      '*.config.ts',
      'migrate-database-calls.js',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended, // Removed strict type checking temporarily
      prettierConfig,
    ],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: [
          './tsconfig.app.json', // For src files
          './tsconfig.node.json', // For build tools
          './tsconfig.supabase.json', // For Supabase functions
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'unused-imports': unusedImports,
      tailwindcss: tailwindcss,
      prettier: prettier,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.app.json',
            './tsconfig.node.json',
            './tsconfig.supabase.json',
          ],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      tailwindcss: {
        callees: ['cn', 'cva', 'clsx'],
      },
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // React specific rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'off', // temporarily disabled for complex game components
      'react-hooks/exhaustive-deps': 'off', // temporarily disabled
      'react-refresh/only-export-components': 'off', // temporarily disabled
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/no-unescaped-entities': 'off', // temporarily disabled

      // TypeScript specific rules (relaxed for now)
      '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // temporarily disabled
      '@typescript-eslint/no-empty-object-type': 'off', // temporarily disabled
      '@typescript-eslint/ban-ts-comment': 'off', // temporarily disabled

      // Import rules (temporarily relaxed)
      'import/order': 'off',
      'import/first': 'off',
      'import/no-duplicates': 'off',

      // Unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Accessibility rules (basic)
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'off', // temporarily disabled
      'jsx-a11y/anchor-is-valid': 'warn',

      // Tailwind specific rules
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/no-contradicting-classname': 'error',

      // General code quality rules
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-console': 'off', // temporarily disabled for development
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-case-declarations': 'off', // temporarily disabled
      'no-constant-condition': 'error',
    },
  },
  // Specific config for Supabase functions
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        Deno: 'readonly',
      },
    },
    rules: {
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Specific config for Three.js components
  {
    files: ['**/CoinFlip3D.tsx'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  }
);
