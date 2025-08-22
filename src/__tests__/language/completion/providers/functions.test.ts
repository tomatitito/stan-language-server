import { describe, expect, it } from "bun:test";
import { provideFunctionCompletions } from "../../../../language/completion/providers/functions";
import type { StanFunction } from "../../../../types/completion";

describe("Function Completion Provider", () => {
  const mockSignatures = [
    "normal(real mu, real sigma)",
    "subtract(real x, real y)",
    "foo(real alpha, real beta)",
    "bar(real x)",
    "baz()",
  ];

  it("should provide completion items for function prefix", () => {
    const text = "myvar = fo";
    const position = { line: 0, character: 10 };

    const result = provideFunctionCompletions(text, position, mockSignatures);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item): item is StanFunction => typeof item.name === "string")).toBe(true);
    expect(result.some(item => item.name === "foo")).toBe(true);
  });

  it("should include built-in statements", () => {
    const text = " print";
    const position = { line: 0, character: 6 };

    const result = provideFunctionCompletions(text, position, []);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "print")).toBe(true);
  });

  it("should return empty array for non-matching prefix", () => {
    const text = "xyz";
    const position = { line: 0, character: 3 };

    const result = provideFunctionCompletions(text, position, mockSignatures);
    expect(result).toHaveLength(0);
  });

  it("should handle whitespace before function name", () => {
    const text = "   fo";
    const position = { line: 0, character: 5 };

    const result = provideFunctionCompletions(text, position, mockSignatures);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "foo")).toBe(true);
  });
});