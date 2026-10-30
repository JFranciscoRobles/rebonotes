import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Plain files, to put on any host: the site has nothing to run on a server.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The packages are given as their sources: those of ReboNotes, and the engines of the suite beside it (Rebosheets for formulas, the viewers of Rebosheets, ReboSlides and Rebodocs for files).
  transpilePackages: ['@rebonotes/core', '@rebonotes/editor', '@rebonotes/react', '@rebonotes/collab', '@rebosheets/core', '@rebosheets/viewer', '@reboslides/viewer', '@rebodocs/viewer'],
  // The root holds this repository and the others of the suite beside it.
  turbopack: { root: path.join(import.meta.dirname, '../../..') },
};

export default config;
