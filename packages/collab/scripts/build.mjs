// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('collab', {
  entries: { index: 'src/protocol.ts', browser: 'src/session.ts', server: 'src/server.ts', storage: 'src/storage.ts', main: 'src/main.ts' },
  exports: { '.': 'index', './browser': 'browser', './server': 'server', './storage': 'storage' },
  bin: { 'rebonotes-collab': 'main' },
  node: true,
  keywords: ['notes', 'wiki', 'collaboration', 'real-time', 'websocket'],
  homepage: 'https://github.com/JFranciscoRobles/rebonotes#readme',
});
