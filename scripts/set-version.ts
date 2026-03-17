#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const version = process.argv[2];

if (!version) {
  console.error('Usage: bun run scripts/set-version.ts <version>');
  process.exit(1);
}

// Validate version format (basic semver check)
if (!/^\d+\.\d+\.\d+(-[\w\d\-\.]+)?(\+[\w\d\-\.]+)?$/.test(version)) {
  console.error('Invalid version format. Expected semver format (e.g., 1.2.3)');
  process.exit(1);
}

const cwd = process.cwd();

const packageJsonPaths = [
  join(cwd, 'package.json'),
  join(cwd, 'npm', 'stan-language-server-bin', 'package.json'),
];

for (const packageJsonPath of packageJsonPaths) {
  if (!existsSync(packageJsonPath)) {
    console.error(`Package file not found: ${packageJsonPath}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated ${packageJsonPath} to ${version}`);
}