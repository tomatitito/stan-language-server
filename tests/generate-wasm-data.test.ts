import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateWasmData } from "../scripts/generate-wasm-data.ts";

describe("generateWasmData", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  test("writes a generated module exporting both WASM payloads as base64 strings", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "sls-wasm-data-"));
    tempDirs.push(tempDir);

    const outputPath = join(tempDir, "src/language/ast/wasm-data.generated.ts");

    await generateWasmData({ outputPath });

    const output = await readFile(outputPath, "utf8");
    const treeSitterWasm = await readFile(
      "node_modules/web-tree-sitter/web-tree-sitter.wasm",
    );
    const stanGrammarWasm = await readFile(
      "node_modules/@wardbrian/tree-sitter-stan/grammars/stan/tree-sitter-stan.wasm",
    );

    expect(output).toContain("export const TREE_SITTER_WASM =");
    expect(output).toContain("export const STAN_GRAMMAR_WASM =");
    expect(output).toContain(treeSitterWasm.toString("base64"));
    expect(output).toContain(stanGrammarWasm.toString("base64"));
  });
});
