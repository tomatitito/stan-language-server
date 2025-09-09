# Publishing Guide

This document explains how to publish the `stan-language-server` npm package.

## Overview

The project supports dual publishing:
1. **npm package**: For integration into other projects and CLI usage
2. **Binary executable**: Standalone executable for direct use

## Automated Publishing (Recommended)

### Prerequisites
1. Set up `NPM_TOKEN` secret in GitHub repository settings
   - Go to npm → Access Tokens → Generate New Token (Classic)
   - Select "Automation" type
   - Add the token as `NPM_TOKEN` in GitHub repository secrets

### Process
1. **Create and push a version tag**:
   ```bash
   # Stable release
   git tag v1.2.3
   git push origin v1.2.3
   
   # Pre-release
   git tag v1.3.0-beta.1
   git push origin v1.3.0-beta.1
   ```

2. **GitHub Actions automatically**:
   - Runs tests (lint, typecheck, unit tests)
   - Builds the package
   - Detects npm tag based on version:
     - `1.2.3` → `latest` tag
     - `1.3.0-alpha.1` → `alpha` tag
     - `1.3.0-beta.1` → `beta` tag  
     - `1.3.0-rc.1` → `rc` tag
     - Other pre-releases → `next` tag
   - Publishes to npm with appropriate tag
   - Creates a GitHub release

## Local Publishing

### Prerequisites
```bash
# Login to npm (one-time setup)
npm login

# Or if using Bun:
bun pm login
```

### Manual Publishing
```bash
# Set version (required)
bun run version:set 1.2.3

# Build and publish (stable release)
bun run publish:local

# Or publish pre-release with specific tag
bun run publish:alpha   # for alpha versions
bun run publish:beta    # for beta versions  
bun run publish:rc      # for release candidates
```

## Version Management

### Setting Version
```bash
# Using the helper script
bun run version:set 1.2.3

# Or manually edit package.json
```

### Version Format
Follow semantic versioning (semver):
- `1.0.0` - Major release
- `1.1.0` - Minor release (new features)
- `1.1.1` - Patch release (bug fixes)
- `1.1.1-beta.1` - Pre-release

## Build Commands

```bash
# Build npm package (to dist/)
bun run build

# Build binary executable
bun run build:binary

# Run all checks
bun run check
```

## Package Contents

The published npm package includes:
- `dist/` - Compiled JavaScript files
- `README.md` - Project documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history

Excluded from package (see `.npmignore`):
- Source TypeScript files
- Test files and fixtures
- Development configuration
- Build scripts

## Troubleshooting

### Publishing Fails
1. **Authentication**: Ensure `NPM_TOKEN` is valid and has publish permissions
2. **Version**: Ensure version number hasn't been published before
3. **Build**: Check that `bun run build` completes successfully

### GitHub Actions Fails
1. **Secrets**: Verify `NPM_TOKEN` is set in repository secrets
2. **Tags**: Ensure tag follows `v*` format (e.g., `v1.2.3`)
3. **Tests**: Check that all tests pass locally first

### Local Publishing Issues
```bash
# Check npm authentication
npm whoami

# Check package contents
npm pack --dry-run

# Publish with verbose output
npm publish --access public --verbose
```

## Pre-release vs Stable Releases

### Pre-release Publishing
```bash
# Automated
git tag v1.3.0-beta.1 && git push origin v1.3.0-beta.1

# Manual  
bun run version:set 1.3.0-beta.1
bun run publish:beta
```

### Installation
```bash
# Latest stable
npm install stan-language-server

# Specific pre-release tag
npm install stan-language-server@beta
npm install stan-language-server@alpha
npm install stan-language-server@rc

# Specific version
npm install stan-language-server@1.3.0-beta.1
```

## Post-Publishing Checklist

1. **Verify on npm**: Check https://www.npmjs.com/package/stan-language-server
2. **Test installation**: 
   - Stable: `npm install -g stan-language-server`
   - Pre-release: `npm install -g stan-language-server@beta`
3. **Update documentation**: Update version references in README
4. **Announce**: Update CHANGELOG.md with release notes