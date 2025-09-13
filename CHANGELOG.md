# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-09-13

### Added
- **Language Server Protocol support** for Stan probabilistic programming language
- **Code Completion** for Stan syntax elements:
  - Keywords (`data`, `parameters`, `model`, `generated quantities`, etc.)
  - Built-in functions (`normal`, `bernoulli`, `exp`, `log`, etc.)
  - Distribution functions with proper sampling syntax
  - Data types (`int`, `real`, `vector`, `matrix`, etc.)
  - Constraints (`lower`, `upper`, `simplex`, etc.)
- **Hover Information** with documentation for:
  - Stan built-in functions
  - Distribution functions with parameter details
- **Real-time Diagnostics** powered by Stan compiler:
  - Syntax errors and warnings
  - Type checking and semantic analysis
  - Compilation errors with line-precise locations
- **Code Formatting** using native Stan compiler
  - Consistent indentation and spacing
  - Preservation of comments and structure
- **Include File Resolution** for modular Stan programs:
  - Support for `#include` directives
  - Workspace-aware file resolution
  - Cross-file compilation and analysis

### Technical Features
- Built with TypeScript and Bun runtime
- Comprehensive test suite (109 tests across 14 test files)
- Clean architecture separating language logic from LSP protocol
- Support for both `.stan` and `.stanfunctions` files
- Incremental document synchronization for performance
- Robust error handling and graceful degradation