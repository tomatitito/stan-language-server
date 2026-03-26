import { describe, expect, it } from "bun:test";
import { provideDistributionCompletions } from "../../../../language/completion/providers/distributions";

describe("Distribution Pattern Recognition", () => {
  const mockDistributions = ["normal", "uniform", "exponential", "beta", "beta_binomial"];

  it("returns all distributions for empty completion context", () => {
    const result = provideDistributionCompletions("y ~ ", { line: 0, character: 4 }, mockDistributions);
    expect(result.map((item) => item.name)).toEqual(mockDistributions);
  });

  const matchingCases = [
    {
      name: "prefix matching",
      text: "y ~ norm",
      position: { line: 0, character: 8 },
      expectedNames: ["normal"],
    },
    {
      name: "rightmost tilde matching",
      text: "x ~ normal(0, 1); y ~ exp",
      position: { line: 0, character: 25 },
      expectedNames: ["exponential"],
    },
    {
      name: "variable whitespace after tilde",
      text: "y ~    norm",
      position: { line: 0, character: 11 },
      expectedNames: ["normal"],
    },
    {
      name: "underscore matching",
      text: "y ~ beta_",
      position: { line: 0, character: 9 },
      expectedNames: ["beta", "beta_binomial"],
    },
  ] as const;

  for (const { name, text, position, expectedNames } of matchingCases) {
    it(`returns matches for ${name}`, () => {
      const resultNames = provideDistributionCompletions(text, position, mockDistributions).map(
        (item) => item.name
      );
      expect(resultNames).toContainAllValues(expectedNames);
    });
  }

  it("returns empty array for non-distribution context", () => {
    const result = provideDistributionCompletions("y = ", { line: 0, character: 4 }, mockDistributions);
    expect(result).toEqual([]);
  });

  it("returns empty array for non-matching distribution prefix", () => {
    const result = provideDistributionCompletions("y ~ xyz", { line: 0, character: 7 }, mockDistributions);
    expect(result).toEqual([]);
  });

  it("filters out empty distribution names", () => {
    const result = provideDistributionCompletions(
      "y ~ ",
      { line: 0, character: 4 },
      [...mockDistributions, ""]
    );
    expect(result.map((item) => item.name)).toEqual(mockDistributions);
  });
});
