import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { CompletionList, type CompletionItem } from "vscode-languageserver-protocol";
import { LSPTestClient } from "./lsp-client";

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
    const content = "model { target += bern";
    const position = { line: 0, character: 22 };

    const uri = "file:///test/test.stan";
    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("bernoulli_lpmf");
    await client.didClose(uri);
  });

  it("should provide distribution completions", async () => {
    const content = "model { foo ~";
    const position = { line: 0, character: 13 };

    const uri = "file:///test/test.stan";
    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("bernoulli");
    await client.didClose(uri);
  })

  it("should provide keyword completions", async () => {
    const content = "data {} transf";
    const position = { line: 0, character: 14 };

    const uri = "file:///test/test.stan";
    await client.didOpen(uri, "stan", content);
    const result = await client.completion(uri, position.line, position.character);
    const labels = extractLabels(result);

    expect(labels).toContain("transformed");
    await client.didClose(uri);
  })

})
