import { describe, expect, it } from "bun:test";
import { provideConstraintCompletions } from "../../../../language/completion/providers/constraints";
import type { Constraint } from "../../../../types/completion";

describe("Constraint Completion Provider", () => {
  it("should provide completion items for constraint prefix", () => {
    const text = "low";
    const position = { line: 0, character: 3 };

    const result = provideConstraintCompletions(text, position);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item): item is Constraint => typeof item.name === "string")).toBe(true);
    expect(result.some(item => item.name === "lower")).toBe(true);
  });

  it("should find upper constraints", () => {
    const text = "upp";
    const position = { line: 0, character: 3 };

    const result = provideConstraintCompletions(text, position);
    
    expect(result.some(item => item.name === "upper")).toBe(true);
  });

  it("should return empty array for non-matching prefix", () => {
    const text = "xyz";
    const position = { line: 0, character: 3 };

    const result = provideConstraintCompletions(text, position);
    expect(result).toHaveLength(0);
  });

  it("should handle whitespace before constraint", () => {
    const text = "   lower";
    const position = { line: 0, character: 8 };

    const result = provideConstraintCompletions(text, position);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "lower")).toBe(true);
  });

  it("should find matrix constraint types", () => {
    const text = "corr";
    const position = { line: 0, character: 4 };

    const result = provideConstraintCompletions(text, position);
    expect(result.some(item => item.name === "corr_matrix")).toBe(true);
  });
});