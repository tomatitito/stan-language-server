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

// Copy LICENSE from repo root so it's included in the npm package
copyFileSync(join(cwd, 'LICENSE'), join(pkgDir, 'LICENSE'));

console.log(`Built stan-language-server-bin to ${pkgDir}`);
