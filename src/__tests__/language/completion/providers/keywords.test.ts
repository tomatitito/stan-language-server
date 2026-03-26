import { describe, expect, it } from "bun:test";
import { provideKeywordCompletions } from "../../../../language/completion/providers/keywords";

describe("Keyword Completion Provider", () => {
  const matchingCases = [
    {
      name: "prefix match",
      text: "fo",
      position: { line: 0, character: 2 },
      expectedName: "for",
    },
    {
      name: "exact keyword match",
      text: "for",
      position: { line: 0, character: 3 },
      expectedName: "for",
    },
    {
      name: "partial match",
      text: "tru",
      position: { line: 0, character: 3 },
      expectedName: "true",
    },
    {
      name: "prefix with leading whitespace",
      text: "   fo",
      position: { line: 0, character: 5 },
      expectedName: "for",
    },
  ] as const;

  for (const { name, text, position, expectedName } of matchingCases) {
    it(`returns matches for ${name}`, () => {
      const result = provideKeywordCompletions(text, position);
      expect(result.map((item) => item.name)).toContain(expectedName);
    });
  }

  it("returns empty array for non-matching prefix", () => {
    const result = provideKeywordCompletions("xyz", { line: 0, character: 3 });
    expect(result).toEqual([]);
  });

  it("returns empty array when no word pattern matches", () => {
    const result = provideKeywordCompletions("~", { line: 0, character: 1 });
    expect(result).toEqual([]);
  });
});
