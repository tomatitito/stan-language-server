import { describe, expect, it } from "bun:test";
import {
  getTextUpToCursor,
  getSearchableItems,
} from "../../../language/completion/util";
import type { Position, Searchable } from "../../../types/completion";

describe("Completion Utilities", () => {
  describe("getTextUpToCursor", () => {
    const cursorCases: Array<{
      name: string;
      text: string;
      position: Position;
      expected: string;
    }> = [
      {
        name: "extract text up to cursor in a single line",
        text: "hello world",
        position: { line: 0, character: 5 },
        expected: "hello",
      },
      {
        name: "extract text up to cursor in a multi-line document",
        text: "line one\nline two\nline three",
        position: { line: 1, character: 4 },
        expected: "line",
      },
      {
        name: "return full line when character exceeds line length",
        text: "short",
        position: { line: 0, character: 100 },
        expected: "short",
      },
      {
        name: "return empty string for out-of-range line",
        text: "line one\nline two",
        position: { line: 5, character: 3 },
        expected: "",
      },
      {
        name: "handle Stan completion context",
        text: "parameters {\n  real mu;\n  variable ~ ",
        position: { line: 2, character: 13 },
        expected: "  variable ~ ",
      },
    ];

    for (const { name, text, position, expected } of cursorCases) {
      it(`should ${name}`, () => {
        const result = getTextUpToCursor(text, position);
        expect(result).toBe(expected);
      });
    }
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
      { name: "exponential" },
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
      expect(results.map((item) => item.name)).toContainValue("normal");
    });

    it("should find prefix matches", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("bet");

      expect(results).toHaveLength(1);
      expect(results.map((item) => item.name)).toContainValue("beta");
    });

    it("should find multiple matches for partial input", () => {
      const searchable = getSearchableItems(testItems);
      const results = searchable.search("e");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((item) => item.name === "exponential")).toBe(true);
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
      expect(results.map((item) => item.name)).toContainValue("student_t");
    });

    it("should handle empty input array", () => {
      const searchable = getSearchableItems([]);
      const results = searchable.search("test");

      expect(results).toHaveLength(0);
    });
  });
});
