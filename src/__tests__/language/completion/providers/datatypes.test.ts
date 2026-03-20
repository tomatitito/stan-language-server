import { describe, expect, it } from "bun:test";
import { provideDatatypeCompletions } from "../../../../language/completion/providers/datatypes";

describe("Datatype Completion Provider", () => {
  const matchingCases = [
    {
      name: "basic datatype prefix",
      text: "int",
      position: { line: 0, character: 3 },
      expectedName: "int",
    },
    {
      name: "vector datatype prefix",
      text: "vec",
      position: { line: 0, character: 3 },
      expectedName: "vector",
    },
    {
      name: "matrix datatype prefix",
      text: "mat",
      position: { line: 0, character: 3 },
      expectedName: "matrix",
    },
    {
      name: "prefix with leading whitespace",
      text: "   int",
      position: { line: 0, character: 6 },
      expectedName: "int",
    },
  ] as const;

  for (const { name, text, position, expectedName } of matchingCases) {
    it(`returns matches for ${name}`, () => {
      const result = provideDatatypeCompletions(text, position);
      expect(result.map((item) => item.name)).toContain(expectedName);
    });
  }

  it("returns empty array for non-matching prefix", () => {
    const result = provideDatatypeCompletions("xyz", { line: 0, character: 3 });
    expect(result).toEqual([]);
  });

  it("returns empty array when no word pattern is present", () => {
    const result = provideDatatypeCompletions("~", { line: 0, character: 1 });
    expect(result).toEqual([]);
  });
});
