# src/language/completion/providers/ Directory

This directory contains individual completion providers that analyze Stan language context and provide domain-specific completion suggestions.

## Purpose

Each provider specializes in a specific category of Stan language completions:
- Analyzing text context to determine completion relevance
- Returning pure domain types without LSP protocol dependencies
- Providing efficient fuzzy search and filtering capabilities
- Supporting context-aware completion triggers

## Architecture Role

```
server.ts → handlers/completion.ts → providers/[category].ts
```

Providers are pure functions that take text context and return arrays of domain-specific completion objects.

## Provider Interface

All providers follow a consistent interface pattern:

```typescript
import type { Position } from "../../../types/completion";

export const provide[Category]Completions = (
  text: string,
  position: Position,
  additionalData?: T[]
): DomainType[] => {
  // Provider implementation
};
```

## Files

### `constraints.ts`
Provides Stan constraint completions for parameter declarations.

**Purpose**: Completes Stan constraint keywords used in parameter declarations and type annotations.

**Key Functions**:
- `provideConstraintCompletions(text, position)`: Returns Constraint[] for constraint context

**Domain Type**: `Constraint[]`
**Trigger Context**: Word patterns at end of current text
**Completion Set**: 
- Boundary constraints: `lower`, `upper`, `offset`, `multiplier`
- Vector constraints: `ordered`, `positive_ordered`, `simplex`, `unit_vector`, `sum_to_zero_vector`
- Matrix constraints: `cholesky_factor_corr`, `cholesky_factor_cov`, `corr_matrix`, `cov_matrix`
- Stochastic matrices: `stochastic_column_matrix`, `stochastic_row_matrix`

**Search Strategy**: Fuzzy search with word/underscore splitting
**Context Pattern**: `(?:^|\s)([\w_]+)$` - word at end of line

### `datatypes.ts`
Provides Stan datatype completions for variable declarations.

**Purpose**: Completes Stan built-in data types for variable declarations and function signatures.

**Key Functions**:
- `provideDatatypeCompletions(text, position)`: Returns Datatype[] for type context

**Domain Type**: `Datatype[]`
**Trigger Context**: Word patterns at end of current text
**Completion Set**:
- Basic types: `void`, `int`, `real`, `complex`
- Vector types: `vector`, `row_vector`, `matrix`, `complex_vector`, `complex_row_vector`, `complex_matrix`
- Constrained types: All constraint types also available as datatypes

**Search Strategy**: Fuzzy search with word/underscore splitting
**Context Pattern**: `(?:^|\s)([\w_]+)$` - word at end of line

### `distributions.ts`
Provides Stan distribution completions for sampling statements.

**Purpose**: Completes Stan distribution names in sampling contexts (after `~` operator).

**Key Functions**:
- `provideDistributionCompletions(text, position, distributions)`: Returns Distribution[] for sampling context

**Domain Type**: `Distribution[]`
**Input Data**: Array of distribution names from Stan compiler
**Trigger Context**: Sampling statements with `~` operator
**Context Pattern**: `.*~\s*([\\w_]*)$` - distribution name after tilde

**Search Strategy**: 
- Returns all distributions if no partial name provided
- Fuzzy search with word/underscore splitting for partial matches
- Filters empty distribution names

**Sampling Context**: Specifically looks for `~distribution_name` pattern in Stan sampling statements

### `functions.ts`
Provides Stan function completions for function calls.

**Purpose**: Completes Stan built-in functions and user-defined functions.

**Key Functions**:
- `provideFunctionCompletions(text, position, functionSignatures)`: Returns StanFunction[] for function context

**Domain Type**: `StanFunction[]`
**Input Data**: Array of function signatures from Stan compiler
**Trigger Context**: Word patterns at end of current text
**Context Pattern**: `(?:^|\s)([\w_]+)$` - word at end of line

**Function Sources**:
- **Compiler Functions**: Extracted from Stan compiler function signatures (name before first `(`)
- **Built-in Statements**: `print`, `reject`, `fatal_error`, `target`
- **Deduplication**: Uses Set to remove duplicate function names

**Search Strategy**: Fuzzy search with word/underscore splitting

### `keywords.ts`
Provides Stan language keyword completions.

**Purpose**: Completes Stan language keywords, control structures, and reserved words.

**Key Functions**:
- `provideKeywordCompletions(text, position)`: Returns Keyword[] for keyword context

**Domain Type**: `Keyword[]`
**Trigger Context**: Word patterns at end of current text
**Context Pattern**: `(?:^|\s)([\w_]+)$` - word at end of line

**Keyword Categories**:
- **Control Flow**: `for`, `in`, `while`, `repeat`, `until`, `if`, `then`, `else`, `break`, `continue`, `return`
- **Boolean/Target**: `true`, `false`, `target`
- **Block Identifiers**: `functions`, `data`, `transformed`, `parameters`, `model`, `generated`, `quantities`
- **Built-in Functions**: `print`, `reject`, `fatal_error`, `profile`, `get_lp`
- **Reserved Keywords**: `struct`, `typedef`, `export`, `auto`, `extern`, `var`, `static`, `array`
- **Constraint Keywords**: `lower`, `upper`, `offset`, `multiplier`, `tuple`
- **Special Identifiers**: `truncate`, `jacobian`

**Search Strategy**: Fuzzy search with word/underscore splitting

## Common Patterns

### Text Processing
All providers use the shared utility for consistent text processing:
```typescript
import { getTextUpToCursor } from "../util";

const textUpToCursor = getTextUpToCursor(text, position);
```

Then apply regex pattern matching for context detection and return appropriate completions.

### Fuzzy Search Integration
All providers use the shared `getSearchableItems` utility:
```typescript
const searchableItems = getSearchableItems(domainItems, {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});
const completionProposals = searchableItems.search(userInput);
```

### Position Interface
All providers import the centralized Position interface:
```typescript
import type { Position } from "../../../types/completion";
```

## Design Principles

### 1. Context Awareness
Each provider analyzes surrounding text to determine if completions are contextually appropriate.

### 2. Pure Functions
All providers are pure functions with no side effects or external state dependencies.

### 3. Domain Type Returns
Providers return domain-specific types (`Keyword[]`, `Distribution[]`, etc.) rather than LSP protocol types.

### 4. Efficient Search
All providers use TrieSearch for efficient fuzzy matching with consistent configuration.

### 5. Pattern Consistency
Similar context patterns and search strategies across all providers for consistent user experience.

## Performance Characteristics

- **Context Analysis**: O(n) where n = current line length
- **Fuzzy Search**: O(k) where k = search term length (TrieSearch efficiency)
- **Memory Usage**: Shared search structures, minimal memory allocation
- **Startup Cost**: One-time search structure initialization per provider

## Testing Strategy

Each provider has comprehensive unit tests verifying:
- Correct domain type returns
- Context-appropriate triggering
- Fuzzy search functionality
- Edge case handling
- Input validation

Example test pattern:
```typescript
describe("Provider Tests", () => {
  it("should return domain types for valid context", () => {
    const result = provideCompletions(text, position, data);
    expect(result.every(item => typeof item.name === "string")).toBe(true);
  });
});
```

## Integration

Providers are coordinated through the completion handler:
1. Handler extracts text and position from LSP request
2. Handler calls all relevant providers in parallel
3. Handler aggregates results from all providers
4. Handler converts domain types to LSP CompletionItems
5. Handler returns unified completion list to LSP client

## Future Enhancements

Planned provider improvements:
- **Context Ranking**: Score completions based on usage context
- **Semantic Analysis**: Type-aware completions using variable context
- **Custom Providers**: User-defined completion extensions
- **Block Completions**: Complete Stan language block structures
- **Variable Completions**: Context-aware variable name suggestions