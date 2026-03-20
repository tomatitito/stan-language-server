import { describe, expect, it } from "bun:test";
import { provideConstraintCompletions } from "../../../../language/completion/providers/constraints";

describe("Constraint Completion Provider", () => {
  const matchingCases = [
    {
      name: "lower constraint prefix",
      text: "low",
      position: { line: 0, character: 3 },
      expectedName: "lower",
    },
    {
      name: "upper constraint prefix",
      text: "upp",
      position: { line: 0, character: 3 },
      expectedName: "upper",
    },
    {
      name: "matrix-style constraint prefix",
      text: "corr",
      position: { line: 0, character: 4 },
      expectedName: "corr_matrix",
    },
    {
      name: "prefix with leading whitespace",
      text: "   lower",
      position: { line: 0, character: 8 },
      expectedName: "lower",
    },
  ] as const;

  for (const { name, text, position, expectedName } of matchingCases) {
    it(`returns matches for ${name}`, () => {
      const result = provideConstraintCompletions(text, position);
      expect(result.map((item) => item.name)).toContain(expectedName);
    });
  }

  it("returns empty array for non-matching prefix", () => {
    const result = provideConstraintCompletions("xyz", { line: 0, character: 3 });
    expect(result).toEqual([]);
  });

  it("returns empty array when no word pattern is present", () => {
    const result = provideConstraintCompletions("~", { line: 0, character: 1 });
    expect(result).toEqual([]);
  });
});
