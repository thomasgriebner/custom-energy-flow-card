module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': { typescript: true, node: true },
  },
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './src/engine', from: './src',
          except: ['./engine', './util/memo.ts', './util/warning-types.ts'] },
        { target: './src/config', from: './src',
          except: ['./config', './util', './engine/types.ts', './i18n', './const.ts'] },
        { target: './src/render', from: './src',
          except: ['./render', './util', './engine/types.ts', './engine/flow-graph.ts',
                   './config/types.ts', './const.ts', './i18n'] },
        { target: './src/util', from: './src', except: ['./util'] },
        { target: './src/i18n', from: './src', except: ['./i18n', './const.ts'] },
        { target: './src/ha', from: './src',
          except: ['./ha', './config/types.ts', './engine/types.ts', './const.ts'] },
        { target: './src/editor.ts', from: './src',
          except: ['./config', './ha', './util', './i18n', './const.ts',
                   './editor-list-sections.ts'] },
        { target: './src/editor-list-sections.ts', from: './src',
          except: ['./config', './ha', './util', './i18n', './const.ts'] },
      ],
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
    }],
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
      'newlines-between': 'never',
      alphabetize: { order: 'asc' },
    }],
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@mdi/js', '@mdi/js/*'],
          message: 'Nur in examples/lib/ + tests/setup/ erlaubt; @mdi/js würde sonst ins Prod-Bundle.'
        },
      ],
    }],
  },
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['scripts/**', '*.config.ts', '*.config.mjs'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['examples/lib/**/*.ts', 'tests/setup/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs', '*.mjs'],
};
