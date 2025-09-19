import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { CompletionList, type CompletionItem } from "vscode-languageserver-protocol";
import { LSPTestClient } from "./lsp-client";

const fixturesDir = path.resolve(__dirname, "../../__fixtures__/");
const workspaceUri = `file://${fixturesDir}`;

describe("Completion", () => {
  let client: LSPTestClient;

  const isCompletionList = (result: any): result is CompletionList => {
    return result.items !== undefined;
  };

  const extractLabels = (result: CompletionList | CompletionItem[]) => {
    if (isCompletionList(result)) {
      return result.items.map(item => item.label);
    } else {
      return result.map(item => item.label);
    }
  }

  beforeAll(async () => {
    // Ensure fixtures exist
    await fs.access(fixturesDir).catch(async () => {
      await fs.mkdir(fixturesDir, { recursive: true });
    });
  });

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

  it("should provide function completions", async () => {
    const uri = `${workspaceUri}/completion_test.stan`;
    const content = "model { target += bern";
    const position = { line: 0, character: 22 };

    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("bernoulli_lpmf");
  });

  it("should provide distribution completions", async () => {
    const uri = `${workspaceUri}/completion_test.stan`;
    const content = "model { foo ~";
    const position = { line: 0, character: 13 };

    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("bernoulli");
  })

  it("should provide keyword completions", async () => {
    const uri = `${workspaceUri}/completion_test.stan`;
    const content = "data {} transf";
    const position = { line: 0, character: 14 };

    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("transformed");
  })

})
