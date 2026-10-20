import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { LSPTestClient } from "./lsp-client";

describe("Go to definition over LSP", () => {
  let client: LSPTestClient;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
    await client.initialize({
      workspaceUri: "file:///test-workspace",
      dynamicRegistration: false,
      codeActionLiteralSupport: false,
      documentChanges: false,
      snippetEditSupport: false,
    });
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

  it("resolved the definition of a user-defined function", async () => {
    const uri = "file:///test-workspace/definition-function.stan";
    const content = `
functions {
  real foo(real x) {
    return x * x;
  }
}
model {
  target += foo(2.0);
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    const result = await client.definition(uri, 6, 13);

    expect(result).toEqual({
      uri,
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });
  });

  it("resolved the definition of a user-defined variable", async () => {
    const uri = "file:///test-workspace/definition-variable.stan";
    const content = `
parameters {
  real foo;
}
model {
  target += foo;
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    const result = await client.definition(uri, 4, 13);

    expect(result).toEqual({
      uri,
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });
  });

  it("uses the updated declaration range immediately after a document edit", async () => {
    const uri = "file:///test-workspace/definition-after-edit.stan";
    const content = `
parameters {
  real foo;
}
model {
  target += foo;
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    // Resolve once to ensure the original document has been indexed.
    expect(await client.definition(uri, 4, 13)).toEqual({
      uri,
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });

    await client.didChangeRanges(uri, [
      {
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        },
        text: "\n",
      },
    ], 2);

    // Do not wait for the debounced index update.
    const result = await client.definition(uri, 5, 13);

    expect(result).toEqual({
      uri,
      range: {
        start: { line: 2, character: 7 },
        end: { line: 2, character: 10 },
      },
    });
  });

  it("resolves shadowed variables to the declaration in the correct scope", async () => {
    const uri = "file:///test-workspace/definition-shadowing.stan";
    const content = `
parameters {
  real foo;
}
model {
  {
    real foo = 1;
    target += foo;
  }
  target += foo;
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    expect(await client.definition(uri, 6, 15)).toEqual({
      uri,
      range: {
        start: { line: 5, character: 9 },
        end: { line: 5, character: 12 },
      },
    });

    expect(await client.definition(uri, 8, 13)).toEqual({
      uri,
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });
  });

  it("returns null for a built-in function", async () => {
    const uri = "file:///test-workspace/definition-builtin.stan";
    const content = `
model {
  target += square(2.0);
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    const result = await client.definition(uri, 1, 13);

    expect(result).toBeNull();
  });

  it("returns its own location when invoked on a definition", async () => {
    const uri = "file:///test-workspace/definition-itself.stan";
    const content = `
parameters {
  real foo;
}
model {
  target += foo;
}
`.trimStart();

    await client.didOpen(uri, "stan", content);

    const result = await client.definition(uri, 1, 8);

    expect(result).toEqual({
      uri,
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });
  });
});
