# src/handlers/ Directory

This directory contains the LSP protocol conversion layer, which bridges between the Language Server Protocol and pure language analysis functions.

## Purpose

Handlers are responsible for:
- Converting LSP protocol types to domain types
- Calling pure language functions
- Converting domain results back to LSP protocol types
- Managing LSP-specific concerns (document management, position conversion, etc.)

## Architecture Role

```
server.ts → handlers/ → language/
```

Handlers sit between the LSP server and language analysis, ensuring language modules remain pure and protocol-independent.

## Files

### `completion.ts`
Manages completion requests by coordinating multiple completion providers.

**Purpose**: Converts LSP CompletionParams to domain types, calls language providers, and converts results to CompletionItem[].

**Key Functions**:
- `handleCompletion(params, documents)`: Main completion handler
- `convertPosition(position)`: Converts LSP position to domain Position
- `getDistributionData()`: Extracts distribution names from compiler
- `getFunctionData()`: Extracts function signatures from compiler
- Conversion functions: `keywordToCompletionItem()`, `distributionToCompletionItem()`, etc.

**Dependencies**:
- `vscode-languageserver` (for LSP types)
- `../language/completion/providers/*` (for pure providers)
- `../stanc/compiler` (for data extraction)
- `../types/completion` (for domain types)

**Input**: LSP CompletionParams + TextDocuments
**Output**: CompletionItem[]

**Process**:
1. Extract document and position from LSP params
2. Convert LSP position to domain Position type
3. Get text content and call all providers:
   - Keywords, distributions, functions, datatypes, constraints
4. Convert domain results to LSP CompletionItems
5. Return combined results

### `index.ts`
Barrel export file for all handlers.

**Purpose**: Provides centralized export point for handler functionality.

**Exports**: 
- `handleCompletion` from `./completion`

**Benefits**:
- Clean import statements: `import { handleCompletion } from "./handlers"`
- Centralized API surface
- Future scalability as more handlers are added
- Consistent module interface

**Future Exports** (when implemented):
```typescript
export { handleCompletion } from "./completion";
export { handleHover } from "./hover";
export { handleDiagnostics } from "./diagnostics";
export { handleFormatting } from "./formatting";
```

## Design Principles

### 1. Protocol Isolation
Handlers are the only layer that imports LSP protocol types. Language modules remain protocol-agnostic.

### 2. Pure Function Coordination
Handlers call pure language functions and handle all side effects (document access, position conversion, etc.).

### 3. Type Conversion
Handlers manage the impedance mismatch between LSP protocol types and domain types.

### 4. Data Aggregation
Handlers coordinate multiple providers and combine their results.

## Usage Pattern

```typescript
// In server.ts
import { handleCompletion } from "./handlers";

connection.onCompletion((params) => {
  return handleCompletion(params, documents);
});
```

## Future Extensions

As the language server grows, new handlers will be added:
- `hover.ts`: Convert hover requests to language hover providers
- `diagnostics.ts`: Convert diagnostic requests to language linting
- `formatting.ts`: Handle formatting requests
- `codeActions.ts`: Manage code action requests

Each handler follows the same pattern:
1. Extract data from LSP params
2. Convert to domain types
3. Call pure language functions  
4. Convert results to LSP protocol types