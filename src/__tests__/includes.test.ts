import { describe, expect, it } from "bun:test";
import { promises as fs } from "fs";
import * as path from "path";
import { getIncludes } from "../stanc/includes";

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

  it.skip("ignores malformed include lines", async () => {
    const doc = `#include\n#include <>\n#include "foo.stan"`;
    const result = await getIncludes(identity)(doc);
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
