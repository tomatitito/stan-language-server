# src/stanc/ Directory

This directory contains the Stan compiler integration layer, providing TypeScript bindings and utilities for interacting with the native Stan compiler (stanc.js).

## Purpose

The stanc module is responsible for:
- Wrapping the native Stan compiler with TypeScript types and interfaces
- Handling #include file resolution and content retrieval
- Processing compiler output into structured success/failure results
- Providing access to Stan compiler's math functions and distributions data
- Managing compiler arguments and configuration

## Architecture Role

```
server.ts → stanc/compiler.ts → stanc.js (native compiler)
                ↓
            stanc/includes.ts
```

The stanc module serves as the bridge between the language server and the native Stan compiler, providing type-safe interfaces and error handling.

## Directory Structure

```
stanc/
├── compiler.ts     # Main compiler wrapper with TypeScript types
├── includes.ts     # #include file resolution utilities
└── stanc.js        # Native Stan compiler bundled as JavaScript
```

## Files

### `compiler.ts`
Main Stan compiler wrapper providing TypeScript interface and compilation orchestration.

**Purpose**: Provides type-safe wrapper around native Stan compiler with include file resolution and structured error handling.

**Key Types**:
- `StancSuccess`: Successful compilation result with optional warnings
- `StancFailure`: Failed compilation with error messages and optional warnings  
- `StancReturn`: Union type for compiler results
- `StancFunction`: Type signature for native stanc function
- `GetIncludesFunction`: Type for include resolution functions

**Key Functions**:
- `compile(getIncludesFn)(document, args)`: Main compilation function with dependency injection
- `getMathSignatures()`: Extracts Stan math function signatures from compiler
- `getMathDistributions()`: Extracts Stan math distribution data from compiler

**Dependencies**:
- `url`: For fileURLToPath conversion
- `vscode-languageserver-textdocument`: For TextDocument interface
- `./includes`: For include file resolution
- `./stanc.js`: Native Stan compiler

**Compilation Process**:
1. **Document Processing**: Extracts filename and content from TextDocument
2. **Include Resolution**: Uses injected getIncludesFn to resolve #include statements
3. **Error Handling**: Checks for file path errors in included files
4. **Argument Preparation**: Builds stanc arguments array with configuration
5. **Compiler Invocation**: Calls native stanc with prepared arguments and includes
6. **Result Handling**: Returns structured StancReturn with success/failure indication

**Compiler Arguments**:
- `auto-format`: Enable automatic formatting
- `filename-in-msg`: Include filename in error messages
- `max-line-length`: Configurable line length (default: 78)
- `canonicalze=deprecations`: Canonicalize deprecation warnings
- `allow-undefined`: Allow undefined functions (for development)
- `functions-only`: Special mode for .stanfunctions files

**Dependency Injection**: Uses higher-order function pattern for include resolution:
```typescript
export const compile = (getIncludesFn: GetIncludesFunction) => 
  async (document: TextDocument, args: string[] = []): Promise<StancReturn>
```

**Export Pattern**: Provides both configurable and default exports:
- `compile`: Configurable function accepting custom include resolver
- `default`: Pre-configured with filesystem-based include resolver

### `includes.ts`
Utilities for parsing and resolving #include statements in Stan files.

**Purpose**: Handles Stan's #include directive parsing and file content resolution with error handling.

**Key Types**:
- `Filename`: String alias for file names
- `FileContent`: String alias for file content
- `FilePathError`: Error object for file resolution failures

**Key Functions**:
- `getFilenames(fileContent)`: Extracts #include filenames from Stan code
- `isFilePathError(value)`: Type guard for FilePathError objects
- `getIncludes(readFileFn)(fileContent)`: Resolves include files with custom file reader

**Include Pattern Parsing**:
- **Regex Pattern**: `/#include\s*[<"]?([^>"\s]*)[>"]?/g`
- **Supported Formats**: 
  - `#include filename.stan`
  - `#include "filename.stan"`
  - `#include <filename.stan>`
  - `#include    filename.stan` (whitespace tolerant)

**File Resolution Process**:
1. **Pattern Extraction**: Uses regex to find all #include statements
2. **Filename Extraction**: Captures filename from various quote/bracket formats
3. **Parallel Reading**: Resolves all files concurrently using Promise.all
4. **Error Handling**: Catches file read errors and converts to FilePathError objects
5. **Result Filtering**: Separates successful reads from errors
6. **Object Construction**: Returns Record<Filename, FileContent> for successful includes

**Error Handling Strategy**:
- Non-blocking: File read errors don't prevent other includes from being processed
- Structured errors: File errors are wrapped in FilePathError objects with descriptive messages
- Filtering: Only successful file reads are included in final result
- Type safety: Uses type guards to distinguish errors from content

**Dependency Injection Pattern**:
```typescript
export const getIncludes = (readFileFn: (filename: string) => Promise<string>) =>
  async (fileContent: FileContent): Promise<Record<Filename, FileContent>>
```

**Default Export**: Pre-configured with Node.js filesystem:
```typescript
export default getIncludes((filename: string) => fs.readFile(filename, "utf-8"))
```

### `stanc.js`
Native Stan compiler bundled as JavaScript module.

**Purpose**: Contains the compiled Stan compiler (stanc) packaged for Node.js execution.

**Key Functions** (accessed via require):
- `stanc(filename, code, args, includes)`: Main compilation function
- `dump_stan_math_signatures()`: Extract function signature data
- `dump_stan_math_distributions()`: Extract distribution data

**Compiler Integration**: Provides the core Stan language compilation capabilities including:
- Syntax parsing and validation
- Type checking and semantic analysis
- Code generation and formatting
- Math library function and distribution metadata

## Design Principles

### 1. Type Safety
All compiler interactions are wrapped with TypeScript types to ensure compile-time safety and better developer experience.

### 2. Error Handling
Structured error handling with clear separation between compilation errors and file system errors.

### 3. Dependency Injection
Key functions use dependency injection to allow testing and customization:
- Include resolution can be customized for different environments
- File reading can be mocked for testing

### 4. Functional Design
Higher-order functions and pure function patterns for composability and testability.

### 5. Resource Management
Efficient handling of file operations with parallel processing and proper error isolation.

## Usage Patterns

### Basic Compilation
```typescript
import compile from "./stanc/compiler";

const result = await compile(document);
if (result.errors) {
  // Handle compilation errors
  console.error(result.errors);
} else {
  // Use successful compilation result
  console.log(result.result);
}
```

### Custom Include Resolution
```typescript
import { compile } from "./stanc/compiler";

const customCompile = compile(async (fileContent) => {
  // Custom include resolution logic
  return resolvedIncludes;
});

const result = await customCompile(document);
```

### Function Metadata Access
```typescript
import { getMathSignatures, getMathDistributions } from "./stanc/compiler";

const signatures = getMathSignatures(); // Get all Stan function signatures
const distributions = getMathDistributions(); // Get all Stan distributions
```

## Testing Strategy

The stanc module supports comprehensive testing through:
- **Dependency Injection**: Mock file system operations for include resolution
- **Type Safety**: Compile-time verification of compiler interfaces
- **Error Scenarios**: Test both successful compilation and various error conditions
- **Integration Testing**: Verify end-to-end compilation with real Stan files

## Performance Characteristics

- **Compilation**: Depends on Stan file complexity and compiler implementation
- **Include Resolution**: Parallel file reading for optimal performance
- **Memory Usage**: Efficient string handling and object construction
- **Caching**: No built-in caching (handled at higher layers if needed)

## Future Enhancements

Planned compiler integration improvements:
- **Streaming Compilation**: Support for large file processing
- **Incremental Compilation**: Cache compilation results for unchanged files
- **Compiler Options**: More granular control over compiler behavior
- **Performance Monitoring**: Metrics collection for compilation times
- **Advanced Error Recovery**: Better error messages and suggestions