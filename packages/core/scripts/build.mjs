// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('core', {
  entries: { index: 'src/index.ts' },
  exports: { '.': 'index' },
  keywords: ['notes', 'wiki', 'markdown', 'blocks', 'workspace', 'knowledge-base'],
  homepage: 'https://github.com/JFranciscoRobles/rebonotes#readme',
});
