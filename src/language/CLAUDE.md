# src/language/ Directory

This directory contains pure language analysis functions that provide core Stan language functionality independent of the Language Server Protocol.

## Purpose

The language module is responsible for:
- Pure language analysis functions with no external dependencies
- Domain-specific logic for Stan language features
- Reusable components that can be used independently of LSP
- Core functionality for completion, hover, and linting

## Architecture Role

```
server.ts → handlers/ → language/
```

Language modules are pure functions that receive domain types and return domain types, with no knowledge of LSP protocol specifics.

## Directory Structure

```
language/
├── completion/          # Completion analysis functions
│   ├── providers/       # Individual completion providers
│   └── util.ts         # Shared completion utilities
├── hover/              # Hover information providers
│   ├── distributions.ts # Distribution hover support
│   └── functions.ts    # Function hover support
└── linter.ts           # Stan code linting utilities
```

## Files

### `linter.ts`
Utilities for processing Stan compiler output into structured diagnostic information.

**Purpose**: Converts Stan compiler error/warning messages into LSP-compatible diagnostic ranges and messages.

**Key Functions**:
- `rangeFromMessage(message)`: Extracts line/column ranges from Stan compiler messages
- `getWarningMessage(message)`: Formats warning messages for display
- `getErrorMessage(message)`: Formats error messages for display

**Dependencies**:
- `vscode-languageserver/node` (for Range type only)

**Input**: Stan compiler error/warning strings
**Output**: Formatted messages and position ranges

**Process**:
1. Parse compiler message format: "in 'filename', line (#), column (#) to (line #,)? column (#)"
2. Extract 1-based line numbers and 0-based column numbers
3. Convert to LSP Range format
4. Clean and format messages for user display
5. Handle special cases like included files

**Notable Features**:
- Handles Stan's mixed indexing (1-based lines, 0-based columns)
- Supports range extraction for multi-character errors
- Processes included file error reporting
- Cleans up compiler output for better UX

### `completion/util.ts`
Shared utilities for completion functionality.

**Purpose**: Provides common utilities for all completion providers, particularly fuzzy search capabilities.

**Key Functions**:
- `getSearchableItems<T>(xs, options)`: Creates TrieSearch instance for fuzzy completion matching

**Dependencies**:
- `trie-search`: Efficient prefix/fuzzy searching
- `../../types/completion`: Domain types (Searchable interface)

**Input**: Array of searchable items with `name` property
**Output**: Configured TrieSearch instance

**Generic Design**: 
- Works with any type extending `Searchable` interface
- Configurable search options via TrieSearchOptions
- Consistent search behavior across all completion providers

## Design Principles

### 1. Pure Functions
All language functions are pure - they take inputs and return outputs without side effects or external dependencies.

### 2. Domain Types
Functions operate on domain-specific types (`Distribution[]`, `StanFunction[]`, etc.) rather than LSP protocol types.

### 3. Protocol Independence
Language modules have no knowledge of LSP protocol specifics, making them reusable and testable.

### 4. Single Responsibility
Each module focuses on a specific language feature (completion, hover, linting).

### 5. Functional Composition
Small, composable functions that can be combined to build complex features.

## Dependencies

The language directory maintains minimal external dependencies:
- `trie-search`: For efficient completion matching
- `vscode-languageserver` types: Only for shared types like Range
- Internal types: Domain types from `../types/`

## Usage Pattern

```typescript
// Pure function call from handlers
import { provideDistributionCompletions } from "../language/completion/providers/distributions";

const distributions = provideDistributionCompletions(text, position, distributionNames);
// Result: Distribution[] - pure domain types
```

## Testing

Language functions are easily testable due to their pure nature:
- No mocking required for external dependencies
- Direct input/output testing
- Isolated unit tests
- Predictable behavior

## Future Extensions

As the language server grows, new language modules will be added:
- `definition/`: Go-to-definition providers
- `references/`: Find references functionality  
- `symbols/`: Document and workspace symbol providers
- `formatting/`: Code formatting logic
- `refactor/`: Code refactoring utilities

Each module follows the same pure function pattern with domain types.