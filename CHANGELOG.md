# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Production Ready Release

### Summary
Complete Language Server Protocol implementation for Stan with all core features:
- **Completion**: Keywords, distributions, functions, datatypes, constraints
- **Hover**: Function and distribution documentation 
- **Diagnostics**: Compiler errors and warnings
- **Formatting**: Stan code formatting via native compiler
- **Include Resolution**: Comprehensive #include handling

Current status: 109 tests passing across 14 test files with production-ready stability.

### Added - Complete Feature Set
- **Formatting System**: Full document formatting using Stan compiler
  - `src/handlers/formatting.ts`: LSP protocol conversion for formatting requests
  - `src/language/formatting/provider.ts`: Pure formatting provider using Stan compiler
  - `src/types/formatting.ts`: Domain types for formatting context and results
  - Comprehensive formatting tests with includes integration
  - Support for both `.stan` and `.stanfunctions` files
- **Enhanced Include Resolution**: Robust #include file handling
  - Workspace document prioritization with filesystem fallback
  - Proper error handling for missing include files
  - Support for relative and absolute include paths
  - Integration with all language features (completion, hover, diagnostics, formatting)

### Changed - Architecture Refinements
- **Unified Compiler Integration**: Consolidated Stan compiler usage across all features
  - `src/stanc/provider.ts`: Unified provider interface for compilation tasks
  - Consistent compilation handling for diagnostics and formatting
  - Improved error handling and type safety for compiler results
- **Enhanced Handler System**: All LSP features follow consistent patterns
  - `src/handlers/completion.ts`: Completion provider to LSP conversion
  - `src/handlers/hover.ts`: Hover provider to LSP conversion  
  - `src/handlers/diagnostics.ts`: Diagnostic provider to LSP conversion
  - `src/handlers/formatting.ts`: Formatting provider to LSP conversion
  - `src/handlers/compilation/`: Dedicated compilation utilities

### Fixed - Production Stability
- **Include Resolution**: Fixed filesystem fallback when workspace documents unavailable
- **Test Isolation**: Enhanced test cleanup preventing cross-test interference
- **Type Safety**: Improved TypeScript strict mode compliance across all modules
- **Error Handling**: Robust error handling for edge cases in all language features
- All 109 tests passing with comprehensive coverage of core functionality

### Technical Improvements - Production Quality
- **Clean Architecture**: Complete separation of language logic from LSP protocol
- **Type Safety**: Comprehensive TypeScript types for all domain objects
- **Testability**: Pure functions with no external dependencies in language layer  
- **Maintainability**: Clear module boundaries and single responsibility principle
- **Performance**: Efficient include resolution with workspace/filesystem caching
- **Consistency**: All features follow identical architectural patterns
- **Documentation**: Comprehensive inline documentation and type definitions

## [v0.5.0] - Compilation Handler Refactoring

### Changed
- **BREAKING**: Refactored compilation architecture to improve modularity and maintainability
  - Replaced direct `compile()` usage with `handleCompilation()` throughout codebase
  - Moved compilation logic from scattered locations into dedicated handlers
  - Centralized include file resolution and compilation handling
  - Improved integration between compilation and include resolution systems

### Added
- New compilation handler system in `src/handlers/compilation/`:
  - `src/handlers/compilation/compilation.ts`: Main compilation handler with `handleCompilation()` function
  - `src/handlers/compilation/includes.ts`: Dedicated include file resolution handler
  - Proper TypeScript types for Stan compiler integration (`StancReturn`, `StancSuccess`, `StancFailure`)
- Enhanced compilation workflow:
  - Integrated include file resolution directly into compilation process
  - Configurable Stan compiler arguments and options
  - Support for both `.stan` and `.stanfunctions` file types

### Technical Improvements
- **Modularity**: Compilation logic properly encapsulated in dedicated handlers
- **Maintainability**: Clear separation between compilation, includes, and diagnostics
- **Consistency**: All features now follow same handler-based architectural pattern
- **Type Safety**: Better TypeScript integration with Stan compiler results
- **Code Quality**: Eliminated duplicate compilation logic across codebase

## [v0.4.0] - Diagnostic System Implementation

### Added
- New diagnostic system architecture following completion handler pattern:
  - `src/types/common.ts`: Shared `Position` interface used by both completion and diagnostics
  - `src/types/diagnostics.ts`: Domain types (`Range`, `DiagnosticSeverity`, `StanDiagnostic`)
  - `src/language/diagnostics/provider.ts`: Pure diagnostic provider returning domain types
  - `src/language/diagnostics/linter.ts`: Message processing utilities
  - `src/language/diagnostics/index.ts`: Barrel exports for diagnostic functionality
  - `src/handlers/diagnostics.ts`: LSP protocol conversion layer for diagnostics
- Server capabilities now include `diagnosticProvider` for LSP compliance

### Changed
- **BREAKING**: Refactored diagnostic architecture to implement LSP-compliant diagnostics
  - Removed automatic validation on document content changes (performance improvement)
  - Implemented proper `textDocument/diagnostic` request handler following LSP specification
  - Language diagnostic functions now return domain types (`StanDiagnostic[]`) instead of LSP types
  - Eliminated LSP dependencies from language layer diagnostic code

### Technical Improvements
- **Performance**: Diagnostics no longer run on every keystroke, only when explicitly requested
- **LSP Compliance**: Proper `textDocument/diagnostic` request handling instead of automatic publishing
- **Resource Efficiency**: Significantly reduced CPU usage during active editing
- **Clean Architecture**: Complete separation between diagnostic domain logic and LSP protocol

## [v0.3.0] - Hover System Implementation

### Added
- Pure hover providers in `src/language/hover/`:
  - `provider.ts`: Main hover provider that coordinates function and distribution hover
  - `functions.ts`: Function name extraction from call contexts
  - `distributions.ts`: Distribution function mapping from sampling contexts
  - `util.ts`: Text parsing utilities
- `src/handlers/hover.ts`: LSP protocol conversion for hover responses

### Changed
- **BREAKING**: Refactored hover functionality following same pattern as completion
- Separated function hover and distribution hover logic
- Created shared utilities for text parsing and word boundary detection

## [v0.2.0] - Completion System Refactoring

### Changed
- **BREAKING**: Refactored completion providers to return domain types (`Keyword[]`, `Distribution[]`, etc.)
- Created handlers layer for LSP protocol conversion
- Established clean dependency flow: `server.ts` → `handlers` → `language/providers`
- Removed LSP dependencies from `src/language` modules

### Added
- New completion handler system in `src/handlers/`:
  - `src/handlers/completion.ts`: Converts provider results to LSP `CompletionItem[]`
  - `src/handlers/index.ts`: Barrel export for all handlers
- Common completion utilities in `src/language/completion/util.ts`
- Comprehensive test suite for completion utilities

### Technical Improvements
- **Type Safety**: Leverages existing types from `src/types/completion.ts`
- **Testability**: Pure functions that don't depend on LSP infrastructure
- **Maintainability**: Clear boundaries and single responsibility principle

## [v0.1.0] - Initial Implementation

### Added
- Basic LSP server implementation using `vscode-languageserver`
- Stan compiler integration with TypeScript types
- Initial completion providers for keywords, distributions, functions, datatypes, constraints
- Basic include file resolution
- Test framework with Bun