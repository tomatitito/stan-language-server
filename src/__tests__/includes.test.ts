import { describe, expect, it, mock } from "bun:test";
import { promises as fs } from "fs";
import * as path from "path";
import { getIncludes, type FileContent } from "../stanc/includes";

const fixturesDir = path.resolve(__dirname, "../__fixtures__");

// Identity function for testing
const identity = async (filename: string) => filename;

describe("getIncludes", () => {
  it("returns an empty object when there are no includes", async () => {
    const doc = "parameters { real y; }";
    const result = await getIncludes(identity)(doc);
    expect(result).toEqual({});
  });

  it("extracts a single include", async () => {
    const doc = `#include "${fixturesDir}/foo.stan"\nmodel { y ~ normal(0,1); }`;
    const result = await getIncludes(identity)(doc);
    const expected = { [`${fixturesDir}/foo.stan`]: `${fixturesDir}/foo.stan` };
    expect(result).toEqual(expected);
  });

  it("extracts multiple includes", async () => {
    const doc = `#include "${fixturesDir}/foo.stan"\n#include <${fixturesDir}/bar.stan>\n#include "${fixturesDir}/baz.stan"`;
    const result = await getIncludes(identity)(doc);
    const expected = {
      [`${fixturesDir}/foo.stan`]: `${fixturesDir}/foo.stan`,
      [`${fixturesDir}/bar.stan`]: `${fixturesDir}/bar.stan`,
      [`${fixturesDir}/baz.stan`]: `${fixturesDir}/baz.stan`,
    };
    expect(result).toEqual(expected);
  });

  it("handles mixed valid and invalid include directives", async () => {
    const doc = `#include nonexistent_file.stan\n#include "${fixturesDir}/foo.stan"`;
    const mockReadFile = async (filename: string) => {
      if (filename === `${fixturesDir}/foo.stan`) {
        return "valid file content" as FileContent;
      } else if (filename === "nonexistent_file.stan") {
        throw new Error("File not found");
      } else {
        throw new Error(`Unexpected filename: ${filename}`);
      }
    };
    const result = await getIncludes(mockReadFile)(doc);
    expect(result).toEqual({
      [`${fixturesDir}/foo.stan`]: "valid file content",
    });
  });

  it("returns empty object for completely invalid include directives", async () => {
    const doc = `#include\n#include <"file2.stan">\n#include hadsjfi`;
    const mockReadFile = async(_: string) => {
      throw new Error("invalid file")
    }
    const result = await getIncludes(mockReadFile)(doc);
    expect(result).toEqual({});
  });

  it("handles includes with extra whitespace", async () => {
    const doc = `#include    "${fixturesDir}/foo.stan"   \n#include   <${fixturesDir}/bar.stan>`;
    const result = await getIncludes(identity)(doc);
    const expected = {
      [`${fixturesDir}/foo.stan`]: `${fixturesDir}/foo.stan`,
      [`${fixturesDir}/bar.stan`]: `${fixturesDir}/bar.stan`,
    };
    expect(result).toEqual(expected);
  });
});
