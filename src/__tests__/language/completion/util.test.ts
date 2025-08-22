import { describe, expect, it } from "bun:test";
import { getTextUpToCursor, getSearchableItems } from "../../../language/completion/util";
import type { Position, Searchable } from "../../../types/completion";

describe("Completion Utilities", () => {
  describe("getTextUpToCursor", () => {
    it("should extract text from start of line to cursor position", () => {
      const text = "hello world";
      const position: Position = { line: 0, character: 5 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("hello");
    });

    it("should handle multi-line text correctly", () => {
      const text = "line one\nline two\nline three";
      const position: Position = { line: 1, character: 4 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("line");
    });

    it("should return empty string for position at start of line", () => {
      const text = "hello world";
      const position: Position = { line: 0, character: 0 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("");
    });

    it("should return full line when cursor is at end", () => {
      const text = "hello";
      const position: Position = { line: 0, character: 5 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("hello");
    });

    it("should handle position beyond line length gracefully", () => {
      const text = "short";
      const position: Position = { line: 0, character: 100 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("short");
    });

    it("should handle invalid line numbers", () => {
      const text = "line one\nline two";
      const position: Position = { line: 5, character: 3 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("");
    });

    it("should handle empty text", () => {
      const text = "";
      const position: Position = { line: 0, character: 0 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("");
    });

    it("should handle text with only newlines", () => {
      const text = "\n\n\n";
      const position: Position = { line: 1, character: 0 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("");
    });

    it("should work with Stan code patterns", () => {
      const text = "parameters {\n  real mu;\n  variable ~ ";
      const position: Position = { line: 2, character: 13 };
      
      const result = getTextUpToCursor(text, position);
      expect(result).toBe("  variable ~ ");
    });
  });

  describe("getSearchableItems", () => {
    interface TestItem extends Searchable {
      name: string;
    }

    const testItems: TestItem[] = [
      { name: "normal" },
      { name: "beta" },
      { name: "gamma" },
      { name: "student_t" },
      { name: "exponential" }
    ];

    it("should create a searchable trie structure", () => {
      const searchable = getSearchableItems(testItems);
      
      expect(searchable).toBeDefined();
      expect(typeof searchable.search).toBe("function");
    });

    it("should find exact matches", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("normal");
      
      expect(results).toHaveLength(1);
      expect(results.map(item => item.name)).toContainValue("normal");
    });

    it("should find prefix matches", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("bet");
      
      expect(results).toHaveLength(1);
      expect(results.map(item => item.name)).toContainValue("beta");
    });

    it("should find multiple matches for partial input", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("e");
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(item => item.name === "exponential")).toBe(true);
    });

    it("should handle empty search term", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("");
      
      // TrieSearch returns empty array for empty search term
      expect(results).toHaveLength(0);
    });

    it("should return empty array for non-matching search", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("xyz");
      
      expect(results).toHaveLength(0);
    });

    it("should work with custom options", () => {
      const options = {
        splitOnRegEx: /[\s_]/g,
        min: 0,
      };
      const searchable = getSearchableItems(testItems, options);
      const results = searchable.search("student");
      
      expect(results).toHaveLength(1);
      expect(results.map(item => item.name)).toContainValue("student_t");
    });

    it("should handle empty input array", () => {
      const searchable = getSearchableItems([]);
      const results = searchable.search("test");
      
      expect(results).toHaveLength(0);
    });
  });
});