import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['**/editor.test.ts', 'happy-dom'],
      ['**/card.test.ts', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/config/**', 'src/util/**'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
