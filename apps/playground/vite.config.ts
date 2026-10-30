// The viewers of the other apps of the suite (Rebosheets, ReboSlides,
// Rebodocs) are linked from their repositories beside this one: the server
// may read them there.

import { defineConfig, searchForWorkspaceRoot } from 'vite';

export default defineConfig({
  server: { port: 5200, fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../../../sheets', '../../../slides', '../../../docs'] } },
});
