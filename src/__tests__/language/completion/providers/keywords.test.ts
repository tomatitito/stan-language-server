import { describe, expect, it } from "bun:test";
import { provideKeywordCompletions } from "../../../../language/completion/providers/keywords";
import type { Keyword } from "../../../../types/completion";

describe("Keyword Completion Provider", () => {
  it("should provide completion items for keyword prefix", () => {
    const text = "fo";
    const position = { line: 0, character: 2 };

    const result = provideKeywordCompletions(text, position);
    
    // Should find keywords starting with "fo" (like "for")
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item): item is Keyword => typeof item.name === "string")).toBe(true);
    expect(result.some(item => item.name === "for")).toBe(true);
  });

  it("should provide completion items for exact keyword match", () => {
    const text = "for";
    const position = { line: 0, character: 3 };

    const result = provideKeywordCompletions(text, position);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "for")).toBe(true);
  });

  it("should return empty array for non-matching prefix", () => {
    const text = "xyz";
    const position = { line: 0, character: 3 };

    const result = provideKeywordCompletions(text, position);
    expect(result).toHaveLength(0);
  });

  it("should handle whitespace before keyword", () => {
    const text = "   fo";
    const position = { line: 0, character: 5 };

    const result = provideKeywordCompletions(text, position);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(item => item.name === "for")).toBe(true);
  });

  it("should return empty array when no word pattern matches", () => {
    const text = "~";
    const position = { line: 0, character: 1 };

    const result = provideKeywordCompletions(text, position);
    expect(result).toHaveLength(0);
  });

  it("should find partial matches", () => {
    const text = "tru";
    const position = { line: 0, character: 3 };

    const result = provideKeywordCompletions(text, position);
    expect(result.some(item => item.name === "true")).toBe(true);
  });
});
