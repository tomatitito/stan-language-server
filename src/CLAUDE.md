# src/ Directory

This directory contains the main source code for the Stan Language Server, organized using a clean separation of concerns architecture.

## Directory Structure

```
src/
├── server.ts              # Main LSP server entry point
├── handlers/               # LSP protocol conversion layer
├── language/               # Pure language analysis functions  
├── stanc/                  # Stan compiler integration
├── types/                  # Domain type definitions
├── __tests__/              # Test files organized by feature
└── __fixtures__/           # Test fixture files
```

## Architecture Overview

The source code follows a layered architecture with clear dependency flow:

**server.ts** → **handlers/** → **language/** 

### Dependency Rules
- `server.ts` depends only on `handlers/` and external LSP libraries
- `handlers/` depends on `language/` and LSP protocol types
- `language/` has no external dependencies except shared utilities
- `stanc/` and `types/` are independent modules used by other layers

## Key Files

### `server.ts`
Main Language Server Protocol implementation that:
- Sets up LSP connection and capabilities
- Handles document synchronization
- Delegates LSP requests to appropriate handlers
- Manages document lifecycle and workspace operations

**Dependencies**: 
- `vscode-languageserver`
- `vscode-languageserver-textdocument`
- `handlers/`

**Key Functions**:
- `onInitialize()`: Sets up server capabilities
- `onCompletion()`: Delegates to completion handler
- `onHover()`: Provides hover information
- `onDocumentFormatting()`: Handles Stan code formatting
- `validateTextDocument()`: Runs diagnostics using Stan compiler

## Directory Details

Each subdirectory contains its own CLAUDE.md file with detailed documentation:

- `handlers/CLAUDE.md`: LSP protocol conversion layer
- `language/CLAUDE.md`: Pure language analysis functions
- `stanc/CLAUDE.md`: Stan compiler integration
- `types/CLAUDE.md`: Domain type definitions
- `__tests__/CLAUDE.md`: Test organization and structure

## Design Principles

1. **Separation of Concerns**: Language logic is independent of LSP protocol
2. **Pure Functions**: Language modules return domain types, not protocol types
3. **Single Responsibility**: Each module has a clear, focused purpose
4. **Testability**: Pure functions are easy to test in isolation
5. **Type Safety**: Strong TypeScript typing throughout