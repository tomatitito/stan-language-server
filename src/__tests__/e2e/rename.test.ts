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
    const content = `
parameters {
  real alpha;
}
model {
  alpha ~ normal(0, 1);
}
`.trimStart();

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

  it("renames bart in the example program from declaration and reference positions", async () => {
    const uri = "file:///test-workspace/rename-bart-example.stan";
    const content = `
data {
  int<lower=0> N;
  vector[N] x;
  vector[N] foo;
}
parameters {
  real alpha;
  real bart;
  real<lower=0> sigma;
}
model {
  real bar = 1 + 2 + 0932407324 + 02934509 + 3 + 5 + 7;
  // real baz = 1 / 2;
  foo ~ normal(alpha + bart * x, 1);
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    expect(await client.prepareRename(uri, 7, 8)).toEqual({
      start: { line: 7, character: 7 },
      end: { line: 7, character: 11 },
    });

    expect(await client.prepareRename(uri, 7, 10)).toEqual({
      start: { line: 7, character: 7 },
      end: { line: 7, character: 11 },
    });

    expect(await client.prepareRename(uri, 13, 24)).toEqual({
      start: { line: 13, character: 23 },
      end: { line: 13, character: 27 },
    });

    const expectedRenameEdit = {
      documentChanges: [
        {
          textDocument: {
            uri,
            version: 1,
          },
          edits: [
            {
              range: {
                start: { line: 7, character: 7 },
                end: { line: 7, character: 11 },
              },
              newText: "beta",
            },
            {
              range: {
                start: { line: 13, character: 23 },
                end: { line: 13, character: 27 },
              },
              newText: "beta",
            },
          ],
        },
      ],
    };

    expect(await client.rename(uri, 7, 8, "beta")).toEqual(expectedRenameEdit);
    expect(await client.rename(uri, 7, 10, "beta")).toEqual(expectedRenameEdit);
    expect(await client.rename(uri, 13, 24, "beta")).toEqual(expectedRenameEdit);
  });

  it("renames symbols correctly after shortening a name via didChange", async () => {
    const uri = "file:///test-workspace/rename-after-shortening.stan";
    const initialContent = `
data {
  int<lower=0> N;
  vector[N] x;
  vector[N] foo;
}
parameters {
  real alpha;
  real beta;
  real<lower=0> sigma;
}
model {
  foo ~ normal(alpha + beta * x, 1);
}
`.trimStart();
    const updatedContent = initialContent.replaceAll("beta", "hoo");

    await client.didOpen(uri, "stan", initialContent);
    await client.didChange(uri, updatedContent, 2);

    expect(await client.prepareRename(uri, 11, 24)).toEqual({
      start: { line: 11, character: 23 },
      end: { line: 11, character: 26 },
    });

    expect(await client.rename(uri, 11, 24, "foo")).toEqual({
      documentChanges: [
        {
          textDocument: {
            uri,
            version: 2,
          },
          edits: [
            {
              range: {
                start: { line: 7, character: 7 },
                end: { line: 7, character: 10 },
              },
              newText: "foo",
            },
            {
              range: {
                start: { line: 11, character: 23 },
                end: { line: 11, character: 26 },
              },
              newText: "foo",
            },
          ],
        },
      ],
    });
  });

});
