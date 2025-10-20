import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import path from "path";
import { LSPTestClient } from "./lsp-client";

const fixturesDir = path.resolve(__dirname, "../../__fixtures__/");
const workspaceUri = `file://${fixturesDir}`;

describe("Formatting", () => {
  let client: LSPTestClient;

  beforeEach(async () => {
    client = new LSPTestClient();
    await client.start();
  });

  afterEach(async () => {
    try {
      await client.shutdown();
      await client.exit();
    } catch (error) {
      // Server might already be stopped
    }
    await client.stop();
  });

  it("should format basic code", async () => {
    const uri = `${workspaceUri}/format-basic.stan`;
    const code = "model {real\n\n\nfoo=1/2.0;}";
    await client.didOpen(uri, "stan", code);

    const results = await client.formatting(uri);

    expect(results).not.toBeNull();
    expect(results.length).toBe(1); // we always just format the entire file
    const newText = results[0]?.newText;
    expect(newText).toBe("model {\n  real foo = 1 / 2.0;\n}\n");
  });

  it("should handle formatting errors", async () => {
    const uri = `${workspaceUri}/format-error.stan`;
    const code = "model {real foo = 1 / 2.0"; // Missing closing brace
    await client.didOpen(uri, "stan", code);

    const results = await client.formatting(uri);

    expect(results).toEqual([]);
  });

  it("should respect maxLineLength settings", async () => {
    const uri = `${workspaceUri}/format-settings.stan`;
    const code = "model {real foo=1/2.0;}";
    await client.didOpen(uri, "stan", code);

    let results = await client.formatting(uri);
    expect(results).not.toBeNull();
    expect(results.length).toBe(1);

    let newText = results[0]?.newText;
    expect(newText).toBe("model {\n  real foo = 1 / 2.0;\n}\n");

    await client.didClose(uri);
    await client.didChangeConfiguration({ "stan-language-server": { maxLineLength: 15 } });

    await new Promise(resolve => setTimeout(resolve, 100));

    await client.didOpen(uri, "stan", code);

    results = await client.formatting(uri);
    expect(results).not.toBeNull();
    expect(results.length).toBe(1);
    newText = results[0]?.newText;
    expect(newText).toBe("model {\n  real foo = 1\n       / 2.0;\n}\n");
  });
});
