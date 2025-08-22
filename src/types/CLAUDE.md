# src/types/ Directory

This directory contains TypeScript type definitions and interfaces that define the domain model for the Stan Language Server.

## Purpose

The types module is responsible for:
- Defining domain-specific types for Stan language constructs
- Providing shared interfaces used across multiple modules
- Ensuring type safety and consistency throughout the codebase
- Creating a clear contract between different layers of the application

## Architecture Role

```
All modules → types/ (shared type definitions)
```

Types serve as the foundation for the entire application, providing common interfaces that all other modules can depend on.

## Directory Structure

```
types/
└── completion.ts    # Completion system type definitions
```

## Files

### `completion.ts`
Core type definitions for the completion system.

**Purpose**: Defines the fundamental types used throughout the completion system to ensure consistency and type safety.

**Position Interface**:
```typescript
export interface Position {
  line: number;
  character: number;
}
```

**Base Interface**:
```typescript
export interface Searchable {
  name: string;
}
```

**Domain Types**:
All completion types extend the `Searchable` interface, ensuring they have a `name` property for consistent search functionality:

- `Distribution`: Represents Stan distributions (e.g., normal, beta, gamma)
- `StanFunction`: Represents Stan functions and built-in statements
- `Keyword`: Represents Stan language keywords and reserved words
- `Datatype`: Represents Stan data types (int, real, vector, matrix, etc.)
- `Constraint`: Represents Stan parameter constraints (lower, upper, etc.)

**Type Hierarchy**:
```typescript
Searchable
├── Distribution
├── StanFunction  
├── Keyword
├── Datatype
└── Constraint
```

**Design Rationale**:
- **Searchable Base**: All completion items need a `name` for fuzzy search functionality
- **Domain Separation**: Each type represents a distinct category of Stan language constructs
- **Extensibility**: New properties can be added to individual types without affecting others
- **Type Safety**: Providers return specific types rather than generic objects

**Usage Pattern**:
```typescript
// Providers return domain-specific types
const distributions: Distribution[] = provideDistributionCompletions(...);
const functions: StanFunction[] = provideFunctionCompletions(...);
const keywords: Keyword[] = provideKeywordCompletions(...);
```

## Design Principles

### 1. Minimal Interface Design
Types define only essential properties, keeping interfaces lean and focused.

### 2. Domain-Driven Types
Each type represents a specific Stan language concept rather than generic completion items.

### 3. Composable Design
Base `Searchable` interface provides common functionality while allowing type-specific extensions.

### 4. Protocol Independence
Types are pure domain objects with no LSP protocol dependencies.

### 5. Future Extensibility
Type structure allows for easy addition of new properties and types as needed.

## Type Safety Benefits

The completion type system provides several benefits:

### 1. Compile-Time Verification
TypeScript compiler ensures all completion providers return the correct types.

### 2. Refactoring Safety
Changes to type definitions are caught at compile time across all usage sites.

### 3. IDE Support
Full IntelliSense and autocomplete support for completion item properties.

### 4. Clear Contracts
Types serve as documentation for expected data structure between modules.

### 5. Runtime Safety
Type guards can be used to verify data shape at runtime if needed.

## Usage Examples

### Provider Implementation
```typescript
import type { Distribution } from "../../types/completion";

export const provideDistributionCompletions = (
  text: string,
  position: Position,
  distributions: string[]
): Distribution[] => {
  return distributions.map(name => ({ name }));
};
```

### Handler Usage
```typescript
import type { Distribution, StanFunction, Keyword } from "../types/completion";

const distributions: Distribution[] = provideDistributionCompletions(...);
const functions: StanFunction[] = provideFunctionCompletions(...);
const keywords: Keyword[] = provideKeywordCompletions(...);
```

### Fuzzy Search Integration
```typescript
import type { Searchable } from "../types/completion";

export const getSearchableItems = <T extends Searchable>(
  items: T[],
  options: TrieSearchOptions<T> = {}
): TrieSearch<T> => {
  const search = new TrieSearch("name", options);
  search.addAll(items);
  return search;
};
```

## Future Type Extensions

As the language server grows, types will be extended to support additional functionality:

### Completion Enhancements
```typescript
export interface Distribution extends Searchable {
  name: string;
  parameters?: string[];          // Distribution parameters
  documentation?: string;         // Help text
  category?: "continuous" | "discrete";
}

export interface StanFunction extends Searchable {
  name: string;
  signature?: string;             // Function signature
  returnType?: string;            // Return type
  parameters?: Parameter[];       // Parameter details
}
```

### New Domain Types
```typescript
export interface Variable extends Searchable {
  name: string;
  type: string;
  scope: "data" | "parameters" | "transformed" | "generated";
}

export interface Block extends Searchable {
  name: string;
  type: "functions" | "data" | "transformed" | "parameters" | "model" | "generated";
}
```

### Language Server Features
```typescript
export interface Definition {
  name: string;
  location: Location;
  type: string;
}

export interface Reference {
  name: string;
  locations: Location[];
}
```

## Testing Integration

Types support comprehensive testing through:
- **Type Guards**: Runtime type checking for test assertions
- **Mock Data**: Easily create test data that conforms to type interfaces
- **Contract Testing**: Verify providers return expected types

## Performance Considerations

The type system is designed for performance:
- **Minimal Memory**: Lean interfaces with only essential properties
- **Structural Typing**: TypeScript's structural typing avoids runtime overhead
- **Shared Interfaces**: Common base types reduce duplication

## Integration Points

Types are used throughout the application:
- **Providers**: Return domain-specific types
- **Handlers**: Process arrays of domain types
- **Utils**: Generic functions operate on Searchable interface
- **Tests**: Type assertions for provider outputs

This type system serves as the foundation for type-safe, maintainable completion functionality across the entire Stan Language Server.