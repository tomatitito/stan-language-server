import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { WorkspaceEdit } from "vscode-languageserver-protocol";
import { LSPTestClient } from "./lsp-client";

describe("Rename", () => {
  let client: LSPTestClient;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
    await client.initialize("file:///test-workspace");
    await client.initialized();
  });

  afterEach(async () => {
    await client.closeAll();
  });

  afterAll(async () => {
    try {
      await client.shutdown();
      await client.exit();
    } catch {
      // Server might already be stopped
    }
    await client.stop();
  });

  it("returns a WorkspaceEdit for current-file occurrences", async () => {
    const uri = "file:///test-workspace/rename-target.stan";
    const content = `parameters {
  real alpha;
}
model {
  alpha ~ normal(0, 1);
}
`;

    await client.didOpen(uri, "stan", content);

    const result: WorkspaceEdit | null = await client.rename(uri, 1, 7, "beta");

    expect(result).toEqual({
      documentChanges: [
        {
          textDocument: {
            uri,
            version: 1,
          },
          edits: [
            {
              range: {
                start: { line: 1, character: 7 },
                end: { line: 1, character: 12 },
              },
              newText: "beta",
            },
            {
              range: {
                start: { line: 4, character: 2 },
                end: { line: 4, character: 7 },
              },
              newText: "beta",
            },
          ],
        },
      ],
    });
  });
});
