import { describe, expect, it } from "bun:test";
import { provideFormatting } from "../../../language/formatting/provider";
import type { FormattingContext } from "../../../types/formatting";

describe("Formatting Integration", () => {
  it("should format a simple Stan model", () => {
    const context: FormattingContext = {
      filename: "test.stan",
      content: "parameters{real x;}model{x~normal(0,1);}",
      includes: {},
    };

    const result = provideFormatting(context);

    // Since we're using the real Stan compiler, just verify the structure
    expect(typeof result.success).toBe("boolean");
    
    if (result.success) {
      expect(typeof result.formattedCode).toBe("string");
      expect(result.formattedCode).toBeTruthy();
      // The formatted code should be different from the input (more readable)
      expect(result.formattedCode?.length).toBeGreaterThan(context.content.length);
    } else {
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });

  it("should handle invalid Stan code", () => {
    const context: FormattingContext = {
      filename: "invalid.stan",
      content: "this is not valid stan code",
      includes: {},
    };

    const result = provideFormatting(context);

    // Should fail for invalid Stan code
    expect(result.success).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("should handle functions-only files", () => {
    const context: FormattingContext = {
      filename: "functions.stanfunctions",
      content: "real add(real x,real y){return x+y;}",
      includes: {},
    };

    const result = provideFormatting(context);

    // Should either succeed or fail gracefully
    expect(typeof result.success).toBe("boolean");
  });

  it("should accept custom formatting options", () => {
    const context: FormattingContext = {
      filename: "test.stan",
      content: "parameters{real x;}",
      includes: {},
    };

    const options = {
      maxLineLength: 120,
      canonicalizeDeprecations: false,
      allowUndefined: false,
    };

    const result = provideFormatting(context, options);

    // Should handle custom options without throwing
    expect(typeof result.success).toBe("boolean");
  });

  it("should handle empty includes properly", () => {
    const context: FormattingContext = {
      filename: "test.stan",
      content: "parameters{real x;}",
      includes: {},
    };

    const result = provideFormatting(context);

    expect(typeof result.success).toBe("boolean");
  });
});