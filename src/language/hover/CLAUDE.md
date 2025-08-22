# src/language/hover/ Directory

This directory contains hover information providers that supply contextual documentation and information for Stan language constructs when users hover over them in the editor.

## Purpose

The hover module is responsible for:
- Providing contextual documentation for Stan functions and distributions
- Extracting function signatures and linking to Stan documentation
- Pattern matching to identify hover targets in Stan code
- Converting Stan compiler data into user-friendly hover information

## Architecture Role

```
server.ts → onHover() → language/hover/[category].ts
```

Hover providers analyze cursor position and surrounding text to provide relevant documentation and type information.

## Directory Structure

```
hover/
├── distributions.ts    # Hover support for Stan distributions
└── functions.ts       # Hover support for Stan functions
```

## Files

### `distributions.ts`
Provides hover information for Stan distributions in sampling statements.

**Purpose**: Shows documentation and function signatures for distributions when hovering over distribution names in sampling contexts.

**Key Functions**:
- `setupDistributionMap()`: Initializes mapping from distribution names to function names
- `tryDistributionHover(document, endOfWord)`: Attempts to provide hover for distributions

**Dependencies**:
- `vscode-languageserver`: For Hover and Range types
- `../../stanc/compiler`: For getMathDistributions()
- `./functions`: For getFunctionDocumentation()
- `vscode-languageserver-textdocument`: For TextDocument and Position types

**Process**:
1. **Initialization**: `setupDistributionMap()` processes Stan compiler's math distributions
   - Parses distribution data format: `"name:extension1,extension2,..."`
   - Creates mapping: `distribution_name` → `distribution_extension` (first extension)
   - Example: `"normal:lpdf,lpmf,rng"` → `"normal"` maps to `"normal_lpdf"`

2. **Hover Detection**: `tryDistributionHover()` analyzes text context
   - **Pattern Matching**: Uses regex `/~\s*(\w+)$/d` to find distribution after `~`
   - **Context**: Looks for sampling statement pattern `variable ~ distribution`
   - **Range Calculation**: Computes exact text range for hover highlight

3. **Documentation Lookup**: 
   - Maps distribution name to corresponding function name
   - Delegates to `getFunctionDocumentation()` for actual documentation
   - Returns null if no documentation found

**Input**: TextDocument and cursor position (end of word)
**Output**: Hover object with documentation content and range, or null

**Distribution Context**: Specifically designed for Stan sampling statements using `~` operator

### `functions.ts`
Provides hover information for Stan functions and built-in statements.

**Purpose**: Shows function signatures, documentation links, and parameter information for Stan functions.

**Key Functions**:
- `setupSignatureMap()`: Initializes function signature and documentation mapping
- `getFunctionDocumentation(name)`: Retrieves documentation for specific function
- `tryFunctionHover(document, endOfWord)`: Attempts to provide hover for functions

**Dependencies**:
- `vscode-languageserver`: For Hover, MarkupContent, RemoteConsole types
- `../../stanc/compiler`: For getMathSignatures()
- `vscode-languageserver-textdocument`: For TextDocument and Position types

**Data Structures**:
- `functionSignatureMap`: Maps function names to MarkupContent documentation

**Process**:
1. **Initialization**: `setupSignatureMap()` processes Stan compiler's function signatures
   - Parses function signatures from compiler output
   - Creates documentation with Stan Functions Reference links
   - Groups multiple signatures for overloaded functions
   - Adds built-in statements: `print`, `reject`, `fatal_error`, `target`

2. **Documentation Generation**: `getDocumentationForFunction()`
   - Creates markdown documentation with links to Stan documentation
   - Format: `[Jump to Stan Functions Reference index entry for {name}](https://mc-stan.org/docs/functions-reference/functions_index.html#{name})`
   - Appends function signatures in code blocks

3. **Signature Aggregation**: Handles function overloading
   - Multiple signatures for same function name are collected
   - Displays all available signatures in unified documentation
   - Uses `appendCodeblock()` helper for consistent formatting

4. **Hover Detection**: `tryFunctionHover()` analyzes text context
   - **Pattern Matching**: Uses regex `/\w+\s*\($/d` to find function calls
   - **Context**: Looks for function name followed by opening parenthesis
   - **Range Calculation**: Computes exact text range for function name only

**Input**: TextDocument and cursor position (end of word)
**Output**: Hover object with function documentation and range, or null

**Function Context**: Designed for function call sites with `function_name(` pattern

## Design Principles

### 1. Context-Aware Detection
Hover providers use specific pattern matching to identify appropriate hover contexts:
- **Distributions**: `~` operator context for sampling statements
- **Functions**: Function call context with `(` opening parenthesis

### 2. Rich Documentation
Provides comprehensive hover information:
- Links to official Stan documentation
- Multiple function signatures for overloaded functions
- Context-specific information (distributions vs functions)

### 3. Compiler Integration
Leverages Stan compiler data for accurate information:
- Function signatures from `getMathSignatures()`
- Distribution data from `getMathDistributions()`
- Ensures hover information matches compiler capabilities

### 4. Range Highlighting
Provides precise text ranges for hover highlights:
- Uses regex match indices for exact positioning
- Highlights only relevant text (function name, distribution name)
- Consistent range calculation across providers

### 5. Graceful Degradation
Handles missing information gracefully:
- Returns null for unrecognized functions/distributions
- Validates data availability before creating hover objects
- No errors for edge cases or invalid contexts

## Initialization Requirements

Both hover providers require initialization with Stan compiler data:
```typescript
// Required setup calls
setupDistributionMap();  // Initialize distribution mappings
setupSignatureMap();     // Initialize function signatures
```

This setup should be called once during language server initialization.

## Documentation Format

Hover documentation uses MarkupContent with markdown formatting:
- **Links**: Direct links to Stan Functions Reference documentation
- **Code Blocks**: Function signatures in `stan` language code blocks
- **Multiple Signatures**: Grouped under "Available signatures" section
- **Context Information**: Additional notes for included files and special cases

## Performance Characteristics

- **Initialization**: O(n) where n = number of functions/distributions from compiler
- **Hover Lookup**: O(1) hash map lookup for function/distribution documentation
- **Pattern Matching**: O(m) where m = text length for regex matching
- **Memory Usage**: Persistent signature and distribution maps

## Testing Strategy

Hover providers should be tested for:
- Correct pattern recognition for different contexts
- Accurate range calculation for hover highlights
- Proper documentation formatting and links
- Handling of missing or invalid data
- Integration with Stan compiler data

## Usage Example

```typescript
// Server initialization
setupDistributionMap();
setupSignatureMap();

// Hover handling
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  
  const position = params.position;
  const endOfWord = document.offsetAt(position);
  
  // Try distribution hover first
  const distHover = tryDistributionHover(document, endOfWord);
  if (distHover) return distHover;
  
  // Try function hover
  const funcHover = tryFunctionHover(document, endOfWord);
  if (funcHover) return funcHover;
  
  return null;
});
```

## Future Enhancements

Planned hover improvements:
- **Variable Hover**: Show variable types and constraints
- **Block Hover**: Documentation for Stan language blocks
- **Include Hover**: File path information for #include statements
- **Type Inference**: Show inferred types for complex expressions
- **Parameter Constraints**: Display parameter constraint information
- **Custom Documentation**: User-defined hover documentation