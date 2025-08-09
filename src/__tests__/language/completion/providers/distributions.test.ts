import { describe, expect, it } from "bun:test";
import { hurz } from "../../../../language/completion/providers/distributions";

describe("Distributions", () => {
  it("should hurz the correct distribution", () => {
    const expected = ["normal", "uniform", "exponential"];
    expect(hurz).toEqual(expected);
  });
});
