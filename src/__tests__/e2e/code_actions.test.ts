import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { CodeAction, InitializeResult, Range, TextDocumentEdit, TextEdit } from "vscode-languageserver-protocol";
import { LSPTestClient } from "./lsp-client";

const cursor = (line: number, character: number): Range => ({
  start: { line, character },
  end: { line, character },
});

describe("Code action client capabilities", () => {
  it.each([false, true])("negotiates literal support %j without documentChanges", async (literalSupport) => {
    const client = new LSPTestClient();
    await client.start();
    try {
      const initialization = await client.initialize(undefined, false, literalSupport, false);
      await client.initialized();
      const uri = "file:///capabilities.stan";
      await client.didOpen(uri, "stan", "functions {\n  real foo() { return 1; }\n}");
      const actions = await client.codeAction(uri, cursor(1, 8));
      if (!literalSupport) {
        expect(initialization.capabilities.codeActionProvider).toBe(false);
        expect(actions).toEqual([]);
      } else {
        expect(actions).toHaveLength(1);
        const action = actions![0] as CodeAction;
        expect(action.edit?.documentChanges).toBeUndefined();
        expect(action.edit?.changes?.[uri]).toEqual([{
          range: cursor(1, 0),
          newText: "  /**\n   * @brief\n   *\n   * @return\n   */\n",
        }]);
      }
      await client.shutdown();
      await client.exit();
    } finally {
      await client.stop();
    }
  });
});

describe("Generate documentation template code action", () => {
  let client: LSPTestClient;
  let initialization: InitializeResult;

  beforeAll(async () => {
    client = new LSPTestClient();
    await client.start();
    initialization = await client.initialize("file:///test-workspace");
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
      // Server might already be stopped.
    }
    await client.stop();
  });

  it("advertises the rewrite code action kind", () => {
    expect(initialization.capabilities.codeActionProvider).toEqual({
      codeActionKinds: ["refactor.rewrite"],
    });
  });

  it("returns a versioned insertion with parameters in declaration order and applies it without duplicates", async () => {
    const uri = "file:///test-workspace/document-function.stan";
    const content = [
      "functions {",
      "  real weighted(real value, vector weights, array[] int indices) {",
      "    return value;",
      "  }",
      "}",
    ].join("\n");
    await client.didOpen(uri, "stan", content);
    await client.didChange(uri, content, 7);

    const actions = await client.codeAction(uri, cursor(1, 10));
    const newText = [
      "  /**",
      "   * @brief",
      "   *",
      "   * @param value",
      "   * @param weights",
      "   * @param indices",
      "   * @return",
      "   */",
      "",
    ].join("\n");
    expect(actions).toEqual([{
      title: "Generate documentation template",
      kind: "refactor.rewrite",
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 7 },
          edits: [{ range: cursor(1, 0), newText }],
        }],
      },
    }]);

    const action = actions![0] as CodeAction;
    const change = action.edit!.documentChanges![0] as TextDocumentEdit;
    const updated = TextDocument.applyEdits(
      TextDocument.create(uri, "stan", 7, content),
      change.edits as TextEdit[],
    );
    expect(updated).toBe(content.replace("  real weighted", `${newText}  real weighted`));
    await client.didChange(uri, updated, 8);
    expect((await client.codeAction(uri, cursor(9, 10))) ?? []).toEqual([]);
  });

  it("uses the latest signature and insertion line immediately after rapid full-document changes", async () => {
    const uri = "file:///test-workspace/document-rapid-changes.stan";
    await client.didOpen(uri, "stan", "functions {\n  void notify() { print(1); }\n}");
    expect(await client.codeAction(uri, cursor(1, 8))).toHaveLength(1);

    void client.didChange(uri, "functions {\n  real identity(real previous) { return previous; }\n}", 2);
    void client.didChange(uri, "functions {\n\n  real identity(real intermediate) { return intermediate; }\n}", 3);
    void client.didChange(uri, [
      "functions {",
      "  // The declaration has moved.",
      "",
      "  real weighted(real current_value, vector current_weights) {",
      "    return current_value;",
      "  }",
      "}",
    ].join("\n"), 4);

    expect(await client.codeAction(uri, cursor(3, 10))).toEqual([{
      title: "Generate documentation template",
      kind: "refactor.rewrite",
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 4 },
          edits: [{
            range: cursor(3, 0),
            newText: "  /**\n   * @brief\n   *\n   * @param current_value\n   * @param current_weights\n   * @return\n   */\n",
          }],
        }],
      },
    }]);
  });

  it("uses current parameters without a return tag immediately after rapid ranged changes to void", async () => {
    const uri = "file:///test-workspace/document-ranged-changes.stan";
    await client.didOpen(uri, "stan", [
      "functions {",
      "  real identity(real previous) {",
      "    return previous;",
      "  }",
      "}",
    ].join("\n"));
    expect(await client.codeAction(uri, cursor(1, 10))).toHaveLength(1);

    void client.didChangeRanges(uri, [{
      range: { start: { line: 1, character: 0 }, end: { line: 4, character: 0 } },
      text: "  void notify(real intermediate) {\n    print(1);\n  }\n",
    }], 2);
    void client.didChangeRanges(uri, [{
      range: cursor(1, 0),
      text: "  // The declaration has moved.\n\n",
    }], 3);
    void client.didChangeRanges(uri, [{
      range: { start: { line: 3, character: 0 }, end: { line: 4, character: 0 } },
      text: "  void notify(real current_value, int current_count) {\n",
    }], 4);

    expect(await client.codeAction(uri, cursor(3, 10))).toEqual([{
      title: "Generate documentation template",
      kind: "refactor.rewrite",
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 4 },
          edits: [{
            range: cursor(3, 0),
            newText: "  /**\n   * @brief\n   *\n   * @param current_value\n   * @param current_count\n   */\n",
          }],
        }],
      },
    }]);
  });

  it("omits parameters and return tags for a void function with no arguments", async () => {
    const uri = "file:///test-workspace/document-void.stan";
    await client.didOpen(uri, "stan", "functions {\n  void notify() {\n    print(1);\n  }\n}");
    const actions = await client.codeAction(uri, cursor(1, 8));
    expect(actions).toEqual([{
      title: "Generate documentation template",
      kind: "refactor.rewrite",
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 1 },
          edits: [{
            range: cursor(1, 0),
            newText: "  /**\n   * @brief\n   *\n   */\n",
          }],
        }],
      },
    }]);
  });

  it("preserves tab indentation and CRLF line endings", async () => {
    const uri = "file:///test-workspace/document-crlf.stan";
    await client.didOpen(uri, "stan", [
      "functions {",
      "\treal constant() {",
      "\t\treturn 1;",
      "\t}",
      "}",
    ].join("\r\n"));
    expect(await client.codeAction(uri, cursor(1, 1))).toEqual([{
      title: "Generate documentation template",
      kind: "refactor.rewrite",
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 1 },
          edits: [{
            range: cursor(1, 0),
            newText: "\t/**\r\n\t * @brief\r\n\t *\r\n\t * @return\r\n\t */\r\n",
          }],
        }],
      },
    }]);
  });

  it("accepts ranges wholly inside a multiline signature, but not leading indentation or the body", async () => {
    const uri = "file:///test-workspace/document-ranges.stan";
    await client.didOpen(uri, "stan", [
      "functions {",
      "  real identity(",
      "      real value",
      "  ) {",
      "    return value;",
      "  }",
      "}",
    ].join("\n"));
    for (const range of [
      cursor(1, 2),
      cursor(2, 9),
      cursor(2, 0),
      cursor(3, 2),
      { start: { line: 1, character: 2 }, end: { line: 3, character: 3 } },
    ]) {
      expect(await client.codeAction(uri, range)).toHaveLength(1);
    }
    for (const range of [
      cursor(0, 0),
      cursor(1, 0),
      cursor(3, 3),
      cursor(4, 8),
      { start: { line: 1, character: 0 }, end: { line: 3, character: 3 } },
      { start: { line: 1, character: 7 }, end: { line: 4, character: 8 } },
      { start: { line: 0, character: 0 }, end: { line: 1, character: 7 } },
    ]) {
      expect((await client.codeAction(uri, range)) ?? []).toEqual([]);
    }
  });

  for (const documentation of ["/** Existing docs */", "/*! Existing docs */", "/// Existing docs", "//! Existing docs"]) {
    it(`does not duplicate preceding ${documentation} documentation`, async () => {
      const uri = "file:///test-workspace/already-documented.stan";
      await client.didOpen(uri, "stan", [
        "functions {",
        `  ${documentation}`,
        "  real identity(real value) {",
        "    return value;",
        "  }",
        "}",
      ].join("\n"));
      expect((await client.codeAction(uri, cursor(2, 10))) ?? []).toEqual([]);
    });
  }

  it("returns no actions for a document that is not open", async () => {
    expect((await client.codeAction("file:///test-workspace/missing.stan", cursor(1, 0))) ?? []).toEqual([]);
  });

  it("returns no actions for a non-Stan document", async () => {
    const uri = "file:///test-workspace/not-stan.txt";
    await client.didOpen(uri, "plaintext", "functions {\n  real constant() { return 1; }\n}");
    expect((await client.codeAction(uri, cursor(1, 8))) ?? []).toEqual([]);
  });
});
