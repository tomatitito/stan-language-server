import { describe, expect, it } from "bun:test";
import { provideDistributionCompletions } from "../../../../language/completion/providers/distributions";
import type { Distribution } from "../../../../types/completion";

describe("Distribution Pattern Recognition", () => {
  const mockDistributions = [
    "normal",
    "uniform", 
    "exponential",
    "beta",
    "beta_binomial",
  ];

  it("returns all distributions for empty completion context", () => {
    const text = "y ~ ";
    const position = { line: 0, character: 4 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.name)).toEqual([
      "normal",
      "uniform",
      "exponential",
      "beta",
      "beta_binomial",
    ]);
    expect(result.every((r): r is Distribution => typeof r.name === "string")).toBe(true);
  });

  it("returns filtered distributions for prefix matching", () => {
    const text = "y ~ norm";
    const position = { line: 0, character: 8 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("normal");
  });

  it("returns empty array for non-distribution context", () => {
    const text = "y = ";
    const position = { line: 0, character: 4 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toEqual([]);
  });

  it("handles multiple tildes on line, captures rightmost", () => {
    const text = "x ~ normal(0, 1); y ~ exp";
    const position = { line: 0, character: 25 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("exponential");
  });

  it("handles variable whitespace after tilde", () => {
    const text = "y ~    norm";
    const position = { line: 0, character: 11 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("normal");
  });

  it("handles underscore in distribution names", () => {
    const text = "y ~ beta_";
    const position = { line: 0, character: 9 };

    const result = provideDistributionCompletions(text, position, mockDistributions);
    const resultNames = result.map((item) => item.name);

    expect(result).toHaveLength(2);
    expect(resultNames).toContainAllValues(["beta_binomial", "beta"]);
  });

  it("returns empty array for non-matching prefix", () => {
    const text = "y ~ xyz";
    const position = { line: 0, character: 7 };

    const result = provideDistributionCompletions(text, position, mockDistributions);

    expect(result).toEqual([]);
  });

  it("filters out empty distribution names", () => {
    const distributionsWithEmpty = [...mockDistributions, ""];
    const text = "y ~ ";
    const position = { line: 0, character: 4 };

    const result = provideDistributionCompletions(text, position, distributionsWithEmpty);

    expect(result).toHaveLength(5); // Should still be 5, not 6
    expect(result.every(item => item.name !== "")).toBe(true);
  });
});
