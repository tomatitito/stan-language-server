# src/language/completion/ Directory

This directory contains pure completion analysis functions that provide Stan language completion functionality independent of the Language Server Protocol.

## Purpose

The completion module is responsible for:
- Pure completion provider functions returning domain types
- Context-aware completion suggestions for Stan language constructs
- Efficient fuzzy search and filtering of completion candidates
- Coordinated completion from multiple specialized providers

## Architecture Role

```
server.ts → handlers/completion.ts → language/completion/providers/
```

Completion providers are pure functions that analyze text context and return domain-specific completion arrays.

## Directory Structure

```
completion/
├── providers/          # Individual completion providers
│   ├── constraints.ts  # Stan constraint completions (~domain(), etc.)
│   ├── datatypes.ts   # Stan datatype completions (int, real, vector, etc.)
│   ├── distributions.ts # Stan distribution completions (~normal(), etc.)
│   ├── functions.ts   # Stan function completions (built-in and user-defined)
│   └── keywords.ts    # Stan keyword completions (for, if, while, etc.)
└── util.ts            # Shared completion utilities
```

## Provider Architecture

### Common Provider Interface

All providers follow a consistent interface pattern:

```typescript
export interface Position {
  line: number;
  character: number;
}

export const provideXCompletions = (
  text: string,
  position: Position,
  additionalData?: T[]
): DomainType[] => {
  // Provider implementation
};
```

### Provider Categories

1. **Static Providers**: Return fixed completion sets (keywords, datatypes)
2. **Dynamic Providers**: Use external data (distributions, functions from compiler)
3. **Context-Aware**: Analyze surrounding text for completion triggers

## Files

### `util.ts`
Shared utilities for all completion providers.

**Purpose**: Provides common functionality for fuzzy search and completion filtering.

**Key Functions**:
- `getSearchableItems<T>(xs, options)`: Creates TrieSearch for efficient completion matching
- `getTextUpToCursor(text, position)`: Extracts text from cursor position to start of line

**Dependencies**:
- `trie-search`: High-performance prefix search
- `../../types/completion`: Searchable and Position interfaces

**Usage Pattern**:
```typescript
// Text processing
const textUpToCursor = getTextUpToCursor(text, position);

// Fuzzy search
const searchableItems = getSearchableItems(domainItems, {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});
const results = searchableItems.search(userInput);
```

### `providers/` Directory

Each provider specializes in a specific category of Stan language completions. See `providers/CLAUDE.md` for detailed documentation of individual providers.

## Design Principles

### 1. Pure Functions
All completion providers are pure functions with no side effects:
- Predictable input/output behavior
- No external state dependencies
- Easy to test and reason about

### 2. Domain Type Returns
Providers return domain-specific types rather than LSP protocol types:
- `Keyword[]` instead of `CompletionItem[]`
- `Distribution[]` instead of `CompletionItem[]`
- `StanFunction[]` instead of `CompletionItem[]`

### 3. Context Analysis
Providers analyze text context to determine completion relevance:
- Position-aware completion triggers
- Surrounding text pattern matching
- Context-specific filtering

### 4. Fuzzy Search Integration
All providers use consistent fuzzy search through `util.ts`:
- TrieSearch for efficient prefix matching
- Configurable search options
- Consistent user experience across providers

### 5. Performance Optimization
Providers are designed for performance:
- Lazy evaluation where possible
- Efficient search algorithms
- Minimal text processing

## Provider Coordination

The completion system coordinates multiple providers through the handler layer:

1. **Text Analysis**: Extract text and position from LSP request
2. **Provider Execution**: Call all relevant providers in parallel
3. **Result Aggregation**: Combine results from all providers
4. **Protocol Conversion**: Convert domain types to LSP CompletionItems

## Testing Strategy

Completion providers are highly testable due to their pure function design:

```typescript
describe("Provider Tests", () => {
  it("should return domain types", () => {
    const result = provideCompletions(text, position, data);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: expect.any(String) })
    ]));
  });
});
```

## Performance Characteristics

- **Trie Search**: O(k) lookup time where k = search term length
- **Context Analysis**: O(n) where n = current line length  
- **Provider Coordination**: Parallel execution for independent providers
- **Memory Efficient**: Shared search structures across calls

## Future Extensions

Planned completion enhancements:
- **Intelligent Ranking**: Context-based completion scoring
- **Semantic Analysis**: Type-aware completions based on variable context
- **Import Completions**: Completions for #include statements
- **Block Completions**: Complete Stan language blocks (functions, data, etc.)
- **Variable Completions**: Context-aware variable name suggestions

## Usage Example

```typescript
// From handler layer
const keywords = provideKeywordCompletions(text, position);
const distributions = provideDistributionCompletions(text, position, distNames);
const functions = provideFunctionCompletions(text, position, signatures);

// Results are pure domain types, ready for protocol conversion
const allCompletions = [...keywords, ...distributions, ...functions];
```