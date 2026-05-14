import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { provideRename } from "../../../language/rename/provider";

describe("provideRename", () => {
  let logSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    logSpy?.mockRestore();
  });

  it("returns an empty mocked occurrence list and logs rename lookup activity", () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = provideRename("parameters { real alpha; }", { line: 0, character: 19 });

    expect(result).toEqual([]);
    expect(logSpy).toHaveBeenCalledWith("rename triggered", { line: 0, character: 19 });
  });
});
