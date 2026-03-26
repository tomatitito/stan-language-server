import { describe, expect, it } from "bun:test";
import { getTextUpToCursor } from "../../handlers/completion";
import type { Position } from "../../types";

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
});
