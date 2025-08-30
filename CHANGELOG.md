# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Refactored completion architecture to improve separation of concerns
  - Language completion providers now return existing types (`Keyword[]`, `Distribution[]`, `StanFunction[]`, `Datatype[]`, `Constraint[]`) instead of LSP-specific types
  - Moved LSP protocol conversion to dedicated handlers in `src/handlers/`
  - Language providers are now pure functions with no `vscode-languageserver` dependencies
  - Updated dependency flow: `server.ts` → `handlers` → `language/providers`

### Added
- New completion handler system in `src/handlers/`
  - `src/handlers/completion.ts`: Converts provider results to LSP `CompletionItem[]`
  - `src/handlers/index.ts`: Barrel export for all handlers
- Centralized `Position` interface in `src/types/completion.ts`
- Common completion utilities in `src/language/completion/util.ts`
  - `getTextUpToCursor()`: Shared text processing utility
  - `getSearchableItems()`: TrieSearch wrapper for fuzzy completion matching
- Comprehensive test suite for completion utilities (`src/__tests__/language/completion/util.test.ts`)

### Refactored
- `src/language/completion/providers/keywords.ts`: Now returns `Keyword[]`
- `src/language/completion/providers/distributions.ts`: Now returns `Distribution[]`
- `src/language/completion/providers/functions.ts`: Now returns `StanFunction[]`
- `src/language/completion/providers/datatypes.ts`: Now returns `Datatype[]`
- `src/language/completion/providers/constraints.ts`: Now returns `Constraint[]`
- All completion providers now use centralized `Position` interface and shared utilities
- Eliminated duplicate `Position` interface definitions across provider files
- Replaced duplicate text processing logic with shared `getTextUpToCursor()` utility
- Updated all completion provider tests to use new pure function interface
- Removed custom `BasicCompletionItem` types in favor of existing type system

### Technical Improvements
- Improved type safety by leveraging existing types from `src/types/completion.ts`
- Enhanced testability with pure functions that don't depend on LSP infrastructure
- Better separation between language logic and protocol implementation
- More maintainable codebase with clear dependency boundaries
- Reduced code duplication through shared utility functions
- Centralized interface definitions for consistency across modules

### Fixed
- All tests updated and passing (52 tests across 8 files)
- Maintained backward compatibility at the LSP protocol level

## [Latest - Diagnostic Refactoring]

### Changed
- **BREAKING**: Refactored diagnostic architecture to implement LSP-compliant diagnostics
  - Removed automatic validation on document content changes (performance improvement)
  - Implemented proper `textDocument/diagnostic` request handler following LSP specification
  - Moved diagnostic logic from `server.ts` to dedicated handlers and providers
  - Language diagnostic functions now return domain types (`StanDiagnostic[]`) instead of LSP types
  - Eliminated LSP dependencies from language layer diagnostic code

### Added
- New diagnostic system architecture following completion handler pattern:
  - `src/types/common.ts`: Shared `Position` interface used by both completion and diagnostics
  - `src/types/diagnostics.ts`: Domain types (`Range`, `DiagnosticSeverity`, `StanDiagnostic`)
  - `src/language/diagnostics/provider.ts`: Pure diagnostic provider returning domain types
  - `src/language/diagnostics/linter.ts`: Message processing utilities (moved from root)
  - `src/language/diagnostics/index.ts`: Barrel exports for diagnostic functionality
  - `src/handlers/diagnostics.ts`: LSP protocol conversion layer for diagnostics
- Server capabilities now include `diagnosticProvider` for LSP compliance
- Comprehensive diagnostic test suite:
  - `src/__tests__/handlers/diagnostics.test.ts`: Handler integration and LSP conversion tests
  - `src/__tests__/language/diagnostics/linter.test.ts`: Message processing utility tests (moved)

### Refactored
- Moved `src/language/linter.ts` to `src/language/diagnostics/linter.ts` for better organization
- Updated `src/language/linter.ts` to use domain `Range` type instead of LSP `Range`
- Removed unused `text` parameter from `provideDiagnostics()` function
- Updated `src/types/completion.ts` to import shared `Position` from `common.ts`
- Reorganized test structure to mirror source directory layout
- Combined diagnostic type imports for cleaner code

### Technical Improvements
- **Performance**: Diagnostics no longer run on every keystroke, only when explicitly requested
- **LSP Compliance**: Proper `textDocument/diagnostic` request handling instead of automatic publishing
- **Resource Efficiency**: Significantly reduced CPU usage during active editing
- **Clean Architecture**: Complete separation between diagnostic domain logic and LSP protocol
- **Better UX**: No interruption during editing, diagnostics appear when client requests them
- **Maintainability**: All diagnostic code logically grouped in single module

### Fixed
- All tests updated and passing (77 tests across 10 files, +17 new diagnostic tests)
- TypeScript compilation with strict mode compliance
- Maintained full diagnostic functionality while improving architecture
- Export of `StancReturn` type from compiler module