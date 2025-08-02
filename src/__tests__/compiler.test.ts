import { describe, expect, it } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import { compile } from "../stanc/compiler";
import { getIncludes } from "../stanc/includes";

const fixturesDir = path.resolve(__dirname, "../__fixtures__");

describe("compile", () => {
  it("compiles a minimal valid Stan model", async () => {
    const stanPath = path.resolve(fixturesDir, "simple.stan");
    const stanCode = await fs.readFile(stanPath, "utf-8");

    const document = TextDocument.create(
      `file://${stanPath}`,
      "stan",
      1,
      stanCode,
    );

    const getIncludesFn = getIncludes((filename: string) => fs.readFile(filename, "utf-8"));
    const result = await compile(getIncludesFn)(document);

    expect(result.errors).toBeUndefined();
    expect(typeof result.result).toBe("string");
    expect(result.result && result.result.length).toBeGreaterThan(0);
  });

});
