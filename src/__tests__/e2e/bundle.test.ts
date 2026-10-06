import { describe, expect, it } from "bun:test";

describe("Server bundles", () => {
  it("bundles the server and dependencies without the Node transport or provider", async () => {
    // Unlike the package build, do not externalize dependencies: a transitive
    // import of the Node LSP transport or filesystem provider must fail here.
    // web-tree-sitter has a runtime-guarded import("module") for its Node path.
    // Leave only that optional import external; it is not executed in browsers.
    const result = await Bun.build({
      entrypoints: [new URL("../../server/index.ts", import.meta.url).pathname],
      target: "browser",
      format: "esm",
      packages: "bundle",
      external: ["module"],
    });

    expect(result.logs.filter((log) => log.level === "error")).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(1);
    const bundle = await result.outputs[0]!.text();
    expect(bundle).toContain("Initializing Stan language server");
  }, 30_000);

  it("bundles the CLI with the Node transport and filesystem provider", async () => {
    const result = await Bun.build({
      entrypoints: [new URL("../../server/cli.ts", import.meta.url).pathname],
      target: "node",
      format: "esm",
      packages: "bundle",
    });

    expect(result.logs.filter((log) => log.level === "error")).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(1);
    const bundle = await result.outputs[0]!.text();
    expect(bundle).toContain("Initializing Stan language server");
    expect(bundle).toContain("node:fs");
  }, 30_000);
});
