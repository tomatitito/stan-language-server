#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
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

const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

packageJson.version = version;

writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Updated package.json version to ${version}`);