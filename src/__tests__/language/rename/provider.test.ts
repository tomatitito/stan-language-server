import { describe, expect, it } from "bun:test";
import { provideRename } from "../../../language/rename/provider";

describe("provideRename", () => {
  it("returns an empty mocked occurrence list", () => {
    const result = provideRename("parameters { real alpha; }", {
      line: 0,
      character: 19,
    });

    expect(result).toEqual([]);
  });
});
