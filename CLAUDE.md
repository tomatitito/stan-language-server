# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A language server for the Stan probabilistic programming language written in TypeScript using Bun. The project implements the Language Server Protocol to provide IDE support for Stan files (.stan).

## Key Commands

### Development
- Run the language server: `bun run src/server.ts`
- Install dependencies: `bun install`
- Run tests: `bun test`

### Building
- Build binary executable: `bun build src/server.ts --compile --outfile stan-language-server`

## Architecture

### Core Components

1. **Language Server (`src/server.ts`)**: Main LSP implementation using `vscode-languageserver`
   - Implements LSP connection and document synchronization
   - Coordinates with handlers for LSP feature implementation
   - Uses incremental text document sync

2. **Handlers (`src/handlers/`)**: LSP protocol conversion layer
   - `completion.ts`: Converts language provider results to LSP CompletionItems
   - `hover.ts`: Converts language provider results to LSP Hover responses
   - `diagnostics.ts`: Converts compiler results to LSP Diagnostic format
   - `compilation/`: Compilation handling utilities
     - `compilation.ts`: Handles Stan code compilation with includes
     - `includes.ts`: Manages #include file resolution for compilation
   - `index.ts`: Barrel export for all handlers
   - Manages the interface between LSP protocol and pure language functions

3. **Language Features (`src/language/`)**: Pure language analysis functions
   - `completion/`: Pure completion providers returning domain types
     - `providers/`: Returns Keyword[], Distribution[], StanFunction[], Datatype[], Constraint[]
     - `util.ts`: Shared utilities for searchable items
   - `hover/`: Pure hover providers returning function/distribution names
     - `provider.ts`: Main hover provider that delegates to specific providers
     - `functions.ts`: Extracts function names from function call contexts
     - `distributions.ts`: Extracts distribution function names from sampling contexts
     - `util.ts`: Shared utilities for text parsing and word boundaries
   - `diagnostics/`: Pure diagnostic analysis functions
     - `provider.ts`: Main diagnostic provider that processes compiler results
     - `linter.ts`: Diagnostic message processing utilities
     - `index.ts`: Barrel export for diagnostic functionality
   - No LSP dependencies - pure domain logic

4. **Stan Compiler Integration (`src/stanc/`)**: 
   - `compiler.ts`: Wraps the Stan compiler (stanc.js) with TypeScript types
   - `includes.ts`: Handles #include file resolution and content retrieval
   - `stanc.js`: Native Stan compiler bundled as JavaScript

5. **Type Definitions (`src/types/`)**: 
   - `completion.ts`: Domain types for completion system (Searchable, Distribution, etc.)
   - `diagnostics.ts`: Domain types for diagnostic system (StanDiagnostic, Severity, etc.)
   - `common.ts`: Shared domain types (Position, Range, etc.)

### Key Types
- `StancReturn`: Union type for compiler success/failure results
- `FileContent`, `Filename`, `FilePath`: Type aliases for file handling
- `Searchable`: Base interface with `name` property for all completion items
- `Distribution`, `Keyword`, `StanFunction`, `Datatype`, `Constraint`: Domain types extending Searchable
- Clean separation between domain types and LSP protocol types

### Testing
- Uses Bun's built-in test framework
- Test fixtures in `src/__fixtures__/` and `__fixtures__/`
- Tests cover:
  - Compiler integration and include resolution
  - Pure completion providers (keywords, distributions, functions, datatypes, constraints)
  - Pure hover providers (functions, distributions)
  - Pure diagnostic providers (linter utilities, diagnostic processing)
  - Handler integration with LSP protocol (completion, diagnostics)
  - All tests verify the new architecture maintains functionality

## TypeScript Configuration
- Target: ESNext with bundler module resolution
- Strict mode enabled with additional safety checks
- Root: `src/`, Output: `build/`

## Rules
- DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.
- You MUST inform the user how to view your work using `container-use log <env_id>` AND `container-use checkout <env_id>` when using environments. Failure to do this will make your work inaccessible to others.

## Suggested Project Structure

### Current Project Structure

The project implements a clean separation of concerns architecture:

- `src/server.ts`: Main LSP server entry point
- `src/handlers/`: LSP protocol conversion layer
  - `completion.ts`: Converts domain types to CompletionItems
  - `hover.ts`: Converts function/distribution names to Hover responses with documentation
  - `diagnostics.ts`: Converts compiler results to LSP Diagnostic format
  - `compilation/`: Compilation handling utilities
    - `compilation.ts`: Handles Stan code compilation with includes
    - `includes.ts`: Manages #include file resolution for compilation
  - `index.ts`: Barrel export for handlers
- `src/language/`: Pure language analysis functions
  - `completion/`: Completion providers returning domain types
    - `providers/`: Individual provider files (keywords, distributions, functions, datatypes, constraints)
    - `util.ts`: Shared utilities for searchable items
  - `hover/`: Pure hover providers that extract function/distribution names
    - `provider.ts`: Main provider that coordinates function and distribution hover
    - `functions.ts`: Function name extraction from call contexts
    - `distributions.ts`: Distribution function mapping from sampling contexts
    - `util.ts`: Text parsing utilities
  - `diagnostics/`: Pure diagnostic analysis functions
    - `provider.ts`: Main diagnostic provider that processes compiler results
    - `linter.ts`: Diagnostic message processing utilities
    - `index.ts`: Barrel export for diagnostic functionality
- `src/stanc/`: Stan compiler integration
  - `compiler.ts`: TypeScript wrapper for Stan compiler
  - `includes.ts`: File include resolution
  - `stanc.js`: Native Stan compiler bundle
- `src/types/`: Domain type definitions
  - `completion.ts`: Completion system types (Searchable, Distribution, etc.)
  - `diagnostics.ts`: Diagnostic system types (StanDiagnostic, Severity, etc.)
  - `common.ts`: Shared domain types (Position, Range, etc.)
- `src/__tests__/`: Test files organized by feature
- `src/__fixtures__/`: Test fixture files

### Dependencies
- `vscode-languageserver`: LSP implementation
- `vscode-languageserver-textdocument`: Document synchronization
- `trie-search`: Efficient fuzzy search for completions

## Proposed Project Structure

### Overview of Proposed Directory Layout
- Comprehensive organization for LSP features
- Modular design separating concerns
- Clear separation of document, language, workspace, and window features

### Proposed Structure Details
- `src/document/`: Document synchronization logic (PROPOSED)
  - Handles LSP document lifecycle events
  - Manages text document state

- `src/language/`: Core language feature implementations (IMPLEMENTED)
  - `completion/`: Completion providers and utilities (IMPLEMENTED)
    - Distribution, keyword, and datatype completions
  - `hover/`: Hover providers and utilities (IMPLEMENTED)
    - Function and distribution hover information
  - Future: definition, references, diagnostics (PROPOSED)

- `src/workspace/`: Workspace-level operations (PROPOSED)
  - Manages workspace symbols, configuration
  - Handles workspace-wide commands and edits

- `src/window/`: UI and messaging features (PROPOSED)
  - Implements show message, log message
  - Progress and document display capabilities

- `src/capabilities/`: Capability management (PROPOSED)
  - Tracks server and client feature support
  - Negotiates LSP protocol capabilities

- `src/utils/`: Shared utility functions (PROPOSED)
  - Common helpers for position and type handling
  - LSP type extensions

- `src/stanc/`: Stan compiler integration (EXISTING)
  - Existing compiler interaction layer

- `src/server.ts`: Main LSP server entry point (EXISTING)

## Recent Changes

### Bug Fixes and Test Improvements (Latest)
- ✅ Fixed filesystem include resolution bug in `handleIncludes` function  
- ✅ Enhanced test isolation with proper spy cleanup in compilation tests
- ✅ Added comprehensive workspace vs filesystem prioritization tests
- ✅ Improved include handler test coverage with fallback scenarios
- ✅ All 91 tests now passing with proper isolation

### Compilation Handler Refactoring (Previous)
- ✅ Added `src/handlers/compilation/` directory for compilation utilities
- ✅ Created `handleCompilation` function to replace direct `compile` usage
- ✅ Moved compilation logic into dedicated handlers
- ✅ Improved include file resolution integration
- ✅ Cleaned up unused compilation code throughout codebase
- ✅ Updated all references from `compile` to `handleCompilation`

### Diagnostic System Implementation (Recent)
- ✅ Added comprehensive diagnostic system with `src/language/diagnostics/`
- ✅ Created `src/handlers/diagnostics.ts` for LSP protocol conversion
- ✅ Implemented pure diagnostic providers and linter utilities
- ✅ Added diagnostic handler tests covering LSP conversion
- ✅ Integrated diagnostics with compiler results and include resolution

### Hover Architecture Refactoring (Previous)
- ✅ Refactored hover functionality following same pattern as completion
- ✅ Created `src/handlers/hover.ts` for LSP protocol conversion
- ✅ Implemented pure hover providers in `src/language/hover/`
- ✅ Separated function hover and distribution hover logic
- ✅ Created shared utilities for text parsing and word boundary detection
- ✅ Maintained backward compatibility at LSP protocol level

### Completion Architecture Refactoring (Foundation)
- ✅ Refactored completion providers to return domain types (Keyword[], Distribution[], etc.)
- ✅ Created handlers layer for LSP protocol conversion
- ✅ Established clean dependency flow: server.ts → handlers → language/providers
- ✅ Removed LSP dependencies from src/language modules
- ✅ Updated all tests to use new pure function interface
- ✅ Maintained full backward compatibility at LSP protocol level

### Architecture Benefits
- **Clean separation**: Language logic independent of LSP protocol
- **Testability**: Pure functions easier to test and reason about
- **Reusability**: Language providers can be used in different contexts
- **Type safety**: Leverages existing domain types instead of creating new ones
- **Maintainability**: Clear boundaries and single responsibility principle
- **Consistent patterns**: All features (completion, hover, diagnostics) follow same architectural patterns
- **Modularity**: Compilation logic is properly encapsulated in dedicated handlers