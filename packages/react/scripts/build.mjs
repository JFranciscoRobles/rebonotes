// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('react', {
  entries: { index: 'src/index.ts' },
  exports: { '.': 'index' },
  client: ['index'],
  keywords: ['notes', 'wiki', 'markdown', 'editor', 'react', 'blocks'],
  homepage: 'https://github.com/JFranciscoRobles/rebonotes#readme',
});
