#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const cwd = process.cwd();
const outDir = join(cwd, 'npm', 'stan-language-server-bin', 'bin');
const outFile = join(outDir, 'cli.js');

mkdirSync(outDir, { recursive: true });

execSync(
  `bun build src/server/cli.ts --outfile ${outFile} --target node --format esm`,
  { stdio: 'inherit', cwd }
);

const content = readFileSync(outFile, 'utf-8');
writeFileSync(outFile, '#!/usr/bin/env node\n' + content);

console.log(`Built stan-language-server-bin CLI to ${outFile}`);
