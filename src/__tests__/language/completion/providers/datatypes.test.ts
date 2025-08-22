import { describe, expect, it } from "bun:test";
import { provideDatatypeCompletions } from "../../../../language/completion/providers/datatypes";
import type { Datatype } from "../../../../types/completion";

describe("Datatype Completion Provider", () => {
  it("should provide completion items for datatype prefix", () => {
    const text = "int";
    const position = { line: 0, character: 3 };

    const result = provideDatatypeCompletions(text, position);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item): item is Datatype => typeof item.name === "string")).toBe(true);
    expect(result.some(item => item.name === "int")).toBe(true);
  });

  it("should find vector types", () => {
    const text = "vec";
    const position = { line: 0, character: 3 };

    const result = provideDatatypeCompletions(text, position);
    
    expect(result.some(item => item.name === "vector")).toBe(true);
  });

  it("should return empty array for non-matching prefix", () => {
    const text = "xyz";
    const position = { line: 0, character: 3 };

    const result = provideDatatypeCompletions(text, position);
    expect(result).toHaveLength(0);
  });

  it("should handle whitespace before datatype", () => {
    const text = "   int";
    const position = { line: 0, character: 6 };

    const result = provideDatatypeCompletions(text, position);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "int")).toBe(true);
  });

  it("should find matrix types", () => {
    const text = "mat";
    const position = { line: 0, character: 3 };

    const result = provideDatatypeCompletions(text, position);
    expect(result.some(item => item.name === "matrix")).toBe(true);
  });
});