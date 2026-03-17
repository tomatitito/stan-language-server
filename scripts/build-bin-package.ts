#!/usr/bin/env bun

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const cwd = process.cwd();
const pkgDir = join(cwd, 'npm', 'stan-language-server-bin');
const outDir = join(pkgDir, 'bin');
const outFile = join(outDir, 'cli.js');

mkdirSync(outDir, { recursive: true });

execSync(
  `bun build src/server/cli.ts --outfile "${outFile}" --target node --format esm`,
  { stdio: 'inherit', cwd }
);

const content = readFileSync(outFile, 'utf-8');
writeFileSync(outFile, '#!/usr/bin/env node\n' + content);

// Copy LICENSE and README from repo root so they're included in the npm package
copyFileSync(join(cwd, 'LICENSE'), join(pkgDir, 'LICENSE'));
copyFileSync(join(cwd, 'README.md'), join(pkgDir, 'README.md'));

console.log(`Built stan-language-server-bin to ${pkgDir}`);
