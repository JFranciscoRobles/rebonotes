// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('editor', {
  entries: { index: 'src/index.ts', rebosheets: 'src/formats/rebosheets.ts', reboslides: 'src/formats/reboslides.ts', rebodocs: 'src/formats/rebodocs.ts' },
  exports: { '.': 'index', './rebosheets': 'rebosheets', './reboslides': 'reboslides', './rebodocs': 'rebodocs' },
  keywords: ['notes', 'wiki', 'markdown', 'editor', 'blocks', 'vanilla'],
  homepage: 'https://github.com/JFranciscoRobles/rebonotes#readme',
});
