# src/__fixtures__/ Directory

This directory contains test fixture files specifically for testing source code modules within the src/ directory.

## Purpose

The src fixtures directory is responsible for:
- Providing Stan code examples for unit testing source modules
- Supporting focused testing of language analysis functions
- Ensuring consistent test data for completion, hover, and compilation testing
- Maintaining isolated test fixtures that don't depend on external files

## Architecture Role

```
src/__tests__/ → src/__fixtures__/ (unit test data dependencies)
```

Fixtures in src/ are specifically designed for testing the internal modules and functions within the source directory.

## Directory Structure

```
src/__fixtures__/
└── simple.stan    # Basic Stan program for unit testing
```

## Files

### `simple.stan`
A minimal Stan program designed specifically for testing language analysis functions and internal module functionality.

**Purpose**: Provides a simple Stan code example for testing:
- Completion provider functionality
- Text analysis and parsing
- Pattern matching in language modules
- Compiler integration with known good code

**Scope**: Used for unit tests that need valid Stan syntax without complex program structure.

**Key Features**:
- Valid Stan syntax and semantics
- Minimal complexity for focused testing
- Representative language constructs
- Suitable for parsing and analysis testing

## Usage Patterns

### Unit Testing
```typescript
import path from "path";
import fs from "fs";

const fixturePath = path.join(__dirname, "__fixtures__", "simple.stan");
const stanCode = fs.readFileSync(fixturePath, "utf-8");

// Use in tests
const result = analyzeStanCode(stanCode);
```

### Text Analysis Testing
```typescript
const text = readFixture("simple.stan");
const completions = provideCompletions(text, position);
expect(completions).toBeDefined();
```

## Fixture Characteristics

### 1. Unit Test Focus
Fixtures are designed specifically for testing individual functions and modules in isolation.

### 2. Deterministic Content
Fixture content is predictable and stable to ensure consistent test results.

### 3. Minimal Dependencies
Fixtures avoid external dependencies like includes to keep tests self-contained.

### 4. Language Coverage
Fixtures exercise key Stan language features relevant to language server functionality.

## Integration with Tests

src/__fixtures__ supports testing of:
- **Completion Providers**: Testing with realistic Stan code patterns
- **Compiler Integration**: Verification with known good Stan programs
- **Text Analysis**: Pattern matching and parsing functionality
- **Language Features**: Hover, formatting, and other language services

## Fixture Management

### File Organization
- Keep fixtures minimal and focused
- Use descriptive filenames that indicate test purpose
- Maintain consistency with root-level __fixtures__ when appropriate

### Content Guidelines
- Ensure all Stan code is valid and compilable
- Include comments explaining fixture purpose
- Use representative Stan language patterns
- Avoid complex or specialized constructs unless specifically needed

## Relationship to Root Fixtures

The src/__fixtures__ directory complements the root __fixtures__ directory:
- **Root fixtures**: Used for integration and end-to-end testing
- **src fixtures**: Used for unit testing of source modules
- **Shared content**: Both may contain similar files for different testing contexts

## Future Enhancements

Planned fixture additions based on testing needs:
- **Provider-specific fixtures**: Tailored Stan code for testing individual completion providers
- **Error fixtures**: Invalid Stan code for error handling testing
- **Pattern fixtures**: Specific code patterns for testing language analysis
- **Minimal examples**: Tiny Stan code snippets for focused unit tests

This fixture directory supports comprehensive unit testing by providing controlled, predictable Stan code examples that ensure individual source modules function correctly in isolation.