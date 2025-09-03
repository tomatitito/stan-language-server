import { describe, expect, it } from "bun:test";
import { DiagnosticSeverity as LspDiagnosticSeverity } from "vscode-languageserver";
import { DiagnosticSeverity as DomainSeverity } from "../../types/diagnostics";
import { provideDiagnostics } from "../../language/diagnostics";

// Test compiler results for diagnostic provider tests
const successfulCompileWithWarnings = {
  errors: undefined,
  result: "successful compilation result",
  warnings: [
    `Warning in 'test.stan', line 1, column 12: Variable name 'jacobian' will
    be a reserved word starting in Stan 2.38.0. Please rename it!
`,
    `Warning: Empty file 'empty.stan' detected; this is a valid stan model but
    likely unintended!`,
  ],
};

const failedCompileWithErrors = {
  errors: [
    `Semantic error in 'test.stan', line 3, column 4 to column 10:
   -------------------------------------------------
     1:  parameters {
     2:      real y;
     3:      int x;
             ^
     4:  }
     5:  model {
   -------------------------------------------------

(Transformed) Parameters cannot be integers.
`,
    `Semantic error in 'test.stan', line 2, column 2 to line 4, column 16:
   -------------------------------------------------
     1:  generated quantities {
     2:    array[3] int x
           ^
     3:             =
     4:               10;
   -------------------------------------------------

Ill-typed arguments supplied to assignment operator =:
The left hand side has type
  array[] int
and the right hand side has type
  int
`,
  ],
  result: undefined,
};

const successfulCompileNoWarnings = {
  errors: undefined,
  result: "successful compilation result",
};

describe("Diagnostic Handler Components", () => {
  describe("diagnostic provider integration", () => {
    it("should process warnings from successful compilation", () => {
      const result = provideDiagnostics(successfulCompileWithWarnings);

      // Should return one diagnostic (warning with position)
      expect(result).toHaveLength(1);
      
      const diagnostic = result[0]!;
      expect(diagnostic.severity).toBe(DomainSeverity.Warning);
      expect(diagnostic.message).toBe("Variable name 'jacobian' will be a reserved word starting in Stan 2.38.0. Please rename it!");
      expect(diagnostic.source).toBe("stan-language-server");
      
      // Check range (0-indexed)
      expect(diagnostic.range.start.line).toBe(0);
      expect(diagnostic.range.start.character).toBe(12);
      expect(diagnostic.range.end.line).toBe(0);
      expect(diagnostic.range.end.character).toBe(12);
    });

    it("should process errors from failed compilation", () => {
      const result = provideDiagnostics(failedCompileWithErrors);

      // Should return two diagnostics (both errors have positions)
      expect(result).toHaveLength(2);
      
      const firstError = result[0]!;
      expect(firstError.severity).toBe(DomainSeverity.Error);
      expect(firstError.message).toBe("(Transformed) Parameters cannot be integers.");
      expect(firstError.source).toBe("stan-language-server");
      
      // Check single line, multi-column range (0-indexed)
      expect(firstError.range.start.line).toBe(2);
      expect(firstError.range.start.character).toBe(4);
      expect(firstError.range.end.line).toBe(2);
      expect(firstError.range.end.character).toBe(10);

      const secondError = result[1]!;
      expect(secondError.severity).toBe(DomainSeverity.Error);
      expect(secondError.message).toContain("Ill-typed arguments supplied to assignment operator");
      
      // Check multi-line range (0-indexed)
      expect(secondError.range.start.line).toBe(1);
      expect(secondError.range.start.character).toBe(2);
      expect(secondError.range.end.line).toBe(3);
      expect(secondError.range.end.character).toBe(16);
    });

    it("should return empty array for successful compilation with no warnings", () => {
      const result = provideDiagnostics(successfulCompileNoWarnings);

      expect(result).toHaveLength(0);
    });

    it("should handle warnings without position information", () => {
      // Test with warnings that don't have position information
      const noPositionResult = {
        errors: undefined,
        result: "success",
        warnings: [
          `Warning: Empty file 'empty.stan' detected; this is a valid stan model but
    likely unintended!`
        ],
      };

      const result = provideDiagnostics( noPositionResult);

      // Should return empty array since warning has no position
      expect(result).toHaveLength(0);
    });
  });

  describe("severity conversion", () => {
    it("should have matching severity values between domain and LSP", () => {
      // Verify that the severity values match between domain and LSP enums
      // This ensures the conversion in the handler works correctly
      expect(DomainSeverity.Error).toBe(LspDiagnosticSeverity.Error);
      expect(DomainSeverity.Warning).toBe(LspDiagnosticSeverity.Warning);
      expect(DomainSeverity.Information).toBe(LspDiagnosticSeverity.Information);
      expect(DomainSeverity.Hint).toBe(LspDiagnosticSeverity.Hint);
    });

    it("should correctly identify severity values", () => {
      expect(DomainSeverity.Error).toBe(1);
      expect(DomainSeverity.Warning).toBe(2);
      expect(DomainSeverity.Information).toBe(3);
      expect(DomainSeverity.Hint).toBe(4);
    });
  });

  describe("range and position handling", () => {
    it("should correctly extract multi-line ranges", () => {
      const multiLineResult = {
        errors: [
          `Semantic error in 'test.stan', line 2, column 2 to line 4, column 16:
   -------------------------------------------------
     1:  generated quantities {
     2:    array[3] int x
           ^
     3:             =
     4:               10;
   -------------------------------------------------

Test multi-line error message.
`,
        ],
        result: undefined,
      };

      const result = provideDiagnostics( multiLineResult);

      expect(result).toHaveLength(1);
      const diagnostic = result[0]!;
      
      // Verify range extraction (0-indexed)
      expect(diagnostic.range.start.line).toBe(1); // line 2 - 1
      expect(diagnostic.range.start.character).toBe(2);
      expect(diagnostic.range.end.line).toBe(3); // line 4 - 1
      expect(diagnostic.range.end.character).toBe(16);
    });

    it("should correctly extract single-line ranges", () => {
      const singleLineResult = {
        errors: [
          `Semantic error in 'test.stan', line 1, column 5 to column 8:
   -------------------------------------------------
     1:  int x;
         ^
   -------------------------------------------------

Test single-line error.
`,
        ],
        result: undefined,
      };

      const result = provideDiagnostics( singleLineResult);

      expect(result).toHaveLength(1);
      const diagnostic = result[0]!;
      
      // Verify single-line range extraction (0-indexed)
      expect(diagnostic.range.start.line).toBe(0); // line 1 - 1
      expect(diagnostic.range.start.character).toBe(5);
      expect(diagnostic.range.end.line).toBe(0);
      expect(diagnostic.range.end.character).toBe(8);
    });
  });

  describe("message extraction and cleaning", () => {
    it("should extract clean warning messages", () => {
      const result = provideDiagnostics(successfulCompileWithWarnings);

      expect(result).toHaveLength(1);
      // Message should be cleaned of position information
      expect(result[0]!.message).toBe("Variable name 'jacobian' will be a reserved word starting in Stan 2.38.0. Please rename it!");
      expect(result[0]!.message).not.toContain("Warning in");
      expect(result[0]!.message).not.toContain("line 1, column 12");
    });

    it("should extract clean error messages", () => {
      const result = provideDiagnostics(failedCompileWithErrors);

      expect(result).toHaveLength(2);
      
      // First error message should be cleaned
      expect(result[0]!.message).toBe("(Transformed) Parameters cannot be integers.");
      expect(result[0]!.message).not.toContain("Semantic error in");
      expect(result[0]!.message).not.toContain("line 3, column 4");
      expect(result[0]!.message).not.toContain("-------------------------------------------------");

      // Second error message should be cleaned and preserve multi-line content
      expect(result[1]!.message).toContain("Ill-typed arguments supplied to assignment operator");
      expect(result[1]!.message).toContain("array[] int");
      expect(result[1]!.message).not.toContain("Semantic error in");
      expect(result[1]!.message).not.toContain("-------------------------------------------------");
    });

    it("should handle complex multi-line error messages", () => {
      const complexResult = {
        errors: [
          `Semantic error in 'test.stan', line 5, column 1 to line 7, column 5:
   -------------------------------------------------
     3:  model {
     4:    real x;
     5:    x ~ normal(0, 1);
         ^
     6:    y ~ normal(x, 1);
     7:  }
   -------------------------------------------------

Variable y is not declared.
This error may have occurred because:
  - Variable y was not declared in the appropriate block
  - There is a typo in the variable name
`,
        ],
        result: undefined,
      };

      const result = provideDiagnostics( complexResult);

      expect(result).toHaveLength(1);
      const diagnostic = result[0]!;
      
      expect(diagnostic.message).toContain("Variable y is not declared.");
      expect(diagnostic.message).toContain("This error may have occurred because:");
      expect(diagnostic.message).toContain("Variable y was not declared in the appropriate block");
      expect(diagnostic.message).toContain("There is a typo in the variable name");
      expect(diagnostic.message).not.toContain("Semantic error in");
      expect(diagnostic.message).not.toContain("-------------------------------------------------");
    });
  });

  describe("LSP conversion functions", () => {
    it("should properly convert domain diagnostic to LSP diagnostic format", () => {

      // Test the conversion by using the diagnostic provider which calls the conversion
      // Since the conversion functions are not exported, we test them indirectly
      const successResult = {
        errors: [
          `Semantic error in 'test.stan', line 2, column 6 to line 3, column 11:
   -------------------------------------------------
     1:  parameters {
     2:      real x;
           ^
     3:      int y;
   -------------------------------------------------

Test error message.
`,
        ],
        result: undefined,
      };

      const result = provideDiagnostics(successResult);
      
      expect(result).toHaveLength(1);
      const diagnostic = result[0]!;
      
      // Verify the conversion maintains the structure expected by LSP
      expect(diagnostic.message).toBe("Test error message.");
      expect(diagnostic.severity).toBe(DomainSeverity.Error); // Should be same as LSP severity
      expect(diagnostic.range.start.line).toBe(1); // 0-indexed
      expect(diagnostic.range.start.character).toBe(6);
      expect(diagnostic.range.end.line).toBe(2);
      expect(diagnostic.range.end.character).toBe(11);
      expect(diagnostic.source).toBe("stan-language-server");
    });

    it("should handle default source value", () => {
      const result = {
        errors: [
          `Semantic error in 'test.stan', line 1, column 1 to column 5:
Test without detailed location info.
`,
        ],
        result: undefined,
      };

      const diagnostics = provideDiagnostics(result);
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]!.source).toBe("stan-language-server");
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle empty error arrays", () => {
      const emptyErrorResult = {
        errors: [],
        result: undefined,
      };

      const result = provideDiagnostics( emptyErrorResult);
      expect(result).toHaveLength(0);
    });

    it("should handle undefined warning arrays", () => {
      const noWarningsResult = {
        errors: undefined,
        result: "success",
        warnings: undefined,
      };

      const result = provideDiagnostics( noWarningsResult);
      expect(result).toHaveLength(0);
    });

    it("should handle undefined error arrays", () => {
      const noErrorsResult = {
        errors: undefined,
        result: "success",
      };

      const result = provideDiagnostics( noErrorsResult);
      expect(result).toHaveLength(0);
    });

    it("should handle malformed position information gracefully", () => {
      const malformedResult = {
        errors: [
          `Semantic error in 'test.stan': Some error without proper position info.`,
          `Syntax error at line: Invalid line format.`,
        ],
        result: undefined,
      };

      const result = provideDiagnostics( malformedResult);
      
      // Should return empty array since no valid positions found
      expect(result).toHaveLength(0);
    });
  });
});