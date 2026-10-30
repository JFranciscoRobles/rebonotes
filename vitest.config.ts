// The tests of every package, in Node: the engine has no DOM, and what the
// editor does without a browser is tried in happy-dom.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
  },
});
