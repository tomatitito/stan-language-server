import { describe, expect, it } from "bun:test";
import { provideFunctionCompletions } from "../../../../language/completion/providers/functions";

describe("Function Completion Provider", () => {
  const mockSignatures = [
    "normal(real mu, real sigma)",
    "subtract(real x, real y)",
    "foo(real alpha, real beta)",
    "bar(real x)",
    "baz()",
  ];

  const matchingCases = [
    {
      name: "function prefix after assignment",
      text: "myvar = fo",
      position: { line: 0, character: 10 },
      expectedName: "foo",
    },
    {
      name: "function prefix with leading whitespace",
      text: "   fo",
      position: { line: 0, character: 5 },
      expectedName: "foo",
    },
  ] as const;

  for (const { name, text, position, expectedName } of matchingCases) {
    it(`returns matches for ${name}`, () => {
      const result = provideFunctionCompletions(text, position, mockSignatures);
      expect(result.map((item) => item.name)).toContain(expectedName);
    });
  }

  it("includes built-in statements", () => {
    const result = provideFunctionCompletions(" print", { line: 0, character: 6 }, []);
    expect(result.map((item) => item.name)).toContain("print");
  });

  it("returns empty array for non-matching prefix", () => {
    const result = provideFunctionCompletions("xyz", { line: 0, character: 3 }, mockSignatures);
    expect(result).toEqual([]);
  });

  it("returns empty array when no word pattern is present", () => {
    const result = provideFunctionCompletions("~", { line: 0, character: 1 }, mockSignatures);
    expect(result).toEqual([]);
  });
});
