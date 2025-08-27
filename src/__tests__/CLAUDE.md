# src/__tests__/ Directory

This directory contains the test suite for the Stan Language Server, organized to mirror the source code structure for easy navigation and maintenance.

## Purpose

The tests directory is responsible for:
- Comprehensive unit testing of all modules and functions
- Integration testing of core functionality
- Ensuring code quality and regression prevention
- Documenting expected behavior through test cases
- Supporting refactoring and maintenance through test coverage

## Architecture Role

```
__tests__/ mirrors src/ structure for parallel test organization
```

Tests are organized to match the source directory structure, making it easy to locate tests for any given module.

## Directory Structure

```
__tests__/
├── compiler.test.ts                # Stan compiler integration tests
├── includes.test.ts                # Include file resolution tests
├── handlers/                       # Handler layer tests
│   └── diagnostics.test.ts        # Diagnostic handler tests
└── language/                       # Language feature tests
    ├── completion/                 # Completion system tests
    │   ├── util.test.ts           # Completion utilities tests
    │   └── providers/             # Individual provider tests
    │       ├── constraints.test.ts # Constraint completion tests
    │       ├── datatypes.test.ts  # Datatype completion tests
    │       ├── distributions.test.ts # Distribution completion tests
    │       ├── functions.test.ts  # Function completion tests
    │       └── keywords.test.ts   # Keyword completion tests
    └── diagnostics/               # Diagnostic system tests
        └── linter.test.ts         # Linter utilities tests
```

## Test Organization Principles

### 1. Parallel Structure
Tests mirror the source directory structure for easy correlation between implementation and tests.

### 2. Feature-Based Testing
Tests are organized by feature area (completion, hover, compilation) rather than by file type.

### 3. Unit Test Focus
Most tests are unit tests that test individual functions and modules in isolation.

### 4. Domain-Driven Testing
Tests verify domain behavior and business logic rather than implementation details.

### 5. Readable Test Names
Test descriptions clearly express expected behavior in natural language.

## Test Files

### Root Level Tests

#### `compiler.test.ts`
Tests for Stan compiler integration functionality.

**Coverage Areas**:
- Successful compilation scenarios
- Error handling for invalid Stan code
- Include file resolution integration
- Compiler argument passing
- Warning and error message processing

**Key Test Categories**:
- Basic compilation functionality
- Error cases and edge conditions
- Include resolution with compiler
- Configuration and argument handling

#### `includes.test.ts`
Tests for #include file resolution utilities.

**Coverage Areas**:
- #include pattern parsing from Stan files
- File content resolution
- Error handling for missing or invalid files
- Different include statement formats
- Dependency injection functionality

**Key Test Categories**:
- Pattern recognition for various #include formats
- File system interaction mocking
- Error scenario handling
- Filename extraction accuracy

### Handler Tests

#### `handlers/diagnostics.test.ts`
Comprehensive tests for the diagnostic handler and provider integration.

**Coverage Areas**:
- Diagnostic provider integration with compiler results
- LSP protocol conversion (domain types → LSP types)
- Range and position handling 
- Message extraction and cleaning
- Severity conversion between domain and LSP enums
- Error handling and edge cases

**Key Test Categories**:
- Processing warnings from successful compilation
- Processing errors from failed compilation
- LSP conversion function accuracy
- Malformed message handling
- Empty result scenarios

### Language Feature Tests

#### `language/completion/util.test.ts`
Tests for shared completion utility functions.

**Coverage Areas**:
- Text processing utilities (`getTextUpToCursor`)
- Fuzzy search functionality (`getSearchableItems`)
- Edge cases and error handling
- Integration with TrieSearch library

**Key Test Categories**:
- Text extraction from cursor position
- Multi-line text handling
- Search functionality and matching
- Boundary conditions and invalid inputs

#### `language/diagnostics/linter.test.ts`
Tests for diagnostic message processing utilities.

**Coverage Areas**:
- Position detection from Stan compiler messages
- Range extraction for single and multi-line errors
- Message cleaning and formatting
- Warning and error message processing
- Edge cases with malformed messages

**Key Test Categories**:
- Position parsing from compiler output format
- Multi-character error range handling
- Message cleanup and formatting
- Include file error processing
- Empty/invalid message handling

### Language Feature Tests

#### `language/completion/providers/`
Comprehensive tests for each completion provider.

**Common Test Patterns**:
```typescript
describe("Provider Name", () => {
  it("should return domain types for valid input", () => {
    const result = provideCompletions(text, position, data);
    expect(result.every(item => typeof item.name === "string")).toBe(true);
  });

  it("should filter completions based on context", () => {
    // Test context-aware completion logic
  });

  it("should handle edge cases gracefully", () => {
    // Test empty inputs, invalid positions, etc.
  });
});
```

**Individual Provider Tests**:

##### `constraints.test.ts`
- Constraint keyword completion verification
- Context pattern matching for constraint scenarios
- Fuzzy search functionality testing
- Edge case handling (empty input, invalid positions)

##### `datatypes.test.ts`
- Stan datatype completion verification
- Type system coverage testing
- Search algorithm accuracy
- Boundary condition testing

##### `distributions.test.ts`
- Distribution completion in sampling contexts
- Pattern matching for `~` operator
- Integration with compiler distribution data
- Context-aware triggering

##### `functions.test.ts`
- Function completion verification
- Built-in statement inclusion testing
- Signature extraction from compiler data
- Context pattern recognition

##### `keywords.test.ts`
- Stan keyword completion coverage
- Language construct recognition
- Reserved word handling
- Context-appropriate triggering

## Testing Framework

The project uses **Bun's built-in test framework** for testing:
- Fast test execution
- TypeScript support out of the box
- Modern testing API similar to Jest
- Integrated with Bun's development workflow

## Test Execution

### Running Tests
```bash
bun test                    # Run all tests
bun test --watch           # Run tests in watch mode
bun test completion        # Run tests matching pattern
```

### Test Structure
Tests use Bun's testing API:
```typescript
import { describe, expect, it } from "bun:test";

describe("Feature Name", () => {
  it("should behave as expected", () => {
    expect(actualResult).toEqual(expectedResult);
  });
});
```

## Test Data and Fixtures

### Mock Data Strategy
Tests use realistic mock data that represents actual Stan language constructs:
- Function signatures matching Stan compiler output
- Distribution names from actual Stan distributions
- Keywords from Stan language specification

### Fixture Organization
Test fixtures are designed to be:
- Realistic: Representative of actual Stan code
- Minimal: Only as complex as needed for the test
- Reusable: Shared across multiple related tests

## Coverage Goals

### Unit Test Coverage
- All completion providers: 100% function coverage
- Completion utilities: Full coverage of shared functions
- Compiler integration: All public functions tested
- Include resolution: All code paths covered
- Error scenarios: All error conditions tested

### Integration Points
- Handler-to-provider integration
- Compiler-to-provider data flow
- End-to-end completion scenarios

## Testing Best Practices

### 1. Pure Function Testing
Most tests verify pure functions with predictable input/output behavior:
```typescript
it("should return expected domain types", () => {
  const result = provider(input, position, data);
  expect(result).toEqual(expectedOutput);
});
```

### 2. Error Case Coverage
Tests include both success and failure scenarios:
```typescript
it("should handle invalid input gracefully", () => {
  const result = provider("", invalidPosition, []);
  expect(result).toHaveLength(0);
});
```

### 3. Type Safety Verification
Tests verify that functions return expected types:
```typescript
it("should return correct domain type", () => {
  const result = provider(text, position, data);
  expect(result.every(item => "name" in item)).toBe(true);
});
```

### 4. Context Testing
Tests verify context-aware behavior:
```typescript
it("should complete in appropriate context", () => {
  const contextualText = "variable ~ ";
  const result = provider(contextualText, position, data);
  expect(result.length).toBeGreaterThan(0);
});
```

## Continuous Integration

Tests are designed to run reliably in CI environments:
- No external dependencies (filesystem, network)
- Deterministic results
- Fast execution times
- Clear failure messages

## Future Test Extensions

As the language server grows, tests will expand to cover:
- **Handler Layer Tests**: LSP protocol conversion testing
- **Integration Tests**: End-to-end language server functionality
- **Performance Tests**: Completion speed and memory usage
- **Regression Tests**: Previously fixed bugs
- **Property-Based Tests**: Fuzzing with random inputs

## Documentation Through Tests

Tests serve as living documentation by:
- Demonstrating expected usage patterns
- Showing input/output examples
- Documenting edge case behavior
- Providing behavioral specifications

This test suite ensures the Stan Language Server remains reliable, maintainable, and correctly implements Stan language support across all completion scenarios.