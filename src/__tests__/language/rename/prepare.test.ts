import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { prepareRename } from "../../../language/rename/prepare";

describe("prepareRename", () => {
  let logSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    logSpy?.mockRestore();
  });

  it("returns a simple identifier target at the requested position", () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = prepareRename("parameters { real alpha; }", { line: 0, character: 19 });

    expect(result).toEqual({
      name: "alpha",
      range: {
        start: { line: 0, character: 18 },
        end: { line: 0, character: 23 },
      },
    });
    expect(logSpy).toHaveBeenCalledWith("prepare rename triggered", { line: 0, character: 19 });
  });

  it("returns null when the requested position is not on an identifier", () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = prepareRename("parameters { real alpha; }", { line: 0, character: 11 });

    expect(result).toBeNull();
  });

  it("returns null for reserved or built-in Stan names", () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = prepareRename("model { real alpha; }", { line: 0, character: 8 });

    expect(result).toBeNull();
  });
});
