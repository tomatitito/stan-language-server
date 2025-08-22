# __fixtures__/ Directory

This directory contains test fixture files used for testing the Stan Language Server functionality across different scenarios.

## Purpose

The fixtures directory is responsible for:
- Providing realistic Stan code examples for testing
- Supporting integration tests with actual Stan syntax
- Ensuring tests use representative Stan language constructs
- Maintaining consistency in test data across the test suite

## Architecture Role

```
__tests__/ → __fixtures__/ (test data dependencies)
```

Fixtures serve as shared test data that multiple tests can use to verify functionality with realistic Stan code.

## Directory Structure

```
__fixtures__/
└── simple.stan    # Basic Stan program for testing
```

## Files

### `simple.stan`
A minimal but complete Stan program used for testing basic compilation and language server functionality.

**Purpose**: Provides a simple, valid Stan program that exercises core language features without complexity.

**Expected Content**:
- Stan program blocks (data, parameters, model)
- Basic variable declarations
- Simple model specification
- Representative Stan syntax patterns

**Usage**: Used by tests that need valid Stan code to verify:
- Compilation functionality
- Syntax highlighting
- Basic language server features
- Document processing

## Fixture Design Principles

### 1. Minimalism
Fixtures contain only the necessary Stan code to test specific functionality, avoiding unnecessary complexity.

### 2. Validity
All fixture files are valid Stan programs that can be successfully compiled by the Stan compiler.

### 3. Representativeness
Fixtures use realistic Stan patterns and constructs that users would typically write.

### 4. Reusability
Fixtures are designed to be useful across multiple test scenarios and test files.

### 5. Maintainability
Fixtures are kept simple and well-documented to facilitate maintenance and updates.

## Future Fixture Extensions

As testing needs grow, additional fixtures may be added:

### Specialized Test Cases
- `distributions.stan`: File demonstrating various Stan distributions
- `functions.stan`: File showing function definitions and calls
- `includes.stan`: File with #include statements for testing include resolution
- `errors.stan`: File with intentional errors for error handling tests
- `complex.stan`: More complex Stan program for advanced testing scenarios

### Feature-Specific Fixtures
- `hierarchical.stan`: Hierarchical model example
- `time_series.stan`: Time series model for specialized testing
- `regression.stan`: Regression model patterns
- `optimization.stan`: Optimization-specific Stan constructs

## Testing Integration

Fixtures are used throughout the test suite:
- **Compiler Tests**: Verify compilation of complete Stan programs
- **Language Server Tests**: Test language features with realistic code
- **Integration Tests**: End-to-end testing with actual Stan syntax
- **Regression Tests**: Ensure previously working code continues to function

## Maintenance Guidelines

### File Updates
When updating fixture files:
1. Ensure Stan code remains valid and compilable
2. Verify that dependent tests still pass
3. Update documentation if fixture purpose changes
4. Consider backward compatibility with existing tests

### Adding New Fixtures
When adding new fixture files:
1. Use descriptive filenames that indicate purpose
2. Keep files minimal and focused
3. Document the fixture's intended use case
4. Ensure the Stan code follows best practices

## Best Practices

### 1. Valid Stan Code
All fixtures should be syntactically and semantically valid Stan programs.

### 2. Focused Purpose
Each fixture should have a clear, specific purpose for testing particular functionality.

### 3. Documentation
Fixture files should include comments explaining their purpose and key features.

### 4. Version Compatibility
Fixtures should use Stan language features compatible with the supported Stan version.

This fixture directory supports comprehensive testing by providing realistic Stan code examples that ensure the language server works correctly with actual user code patterns.