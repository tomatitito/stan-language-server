import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleCodeAction } from "../../handlers/code_action.ts";
import type { WorkspaceIndex } from "../../language/ast/types.ts";
import {
  createWorkspaceIndex,
  upsertSemanticIndexEntry,
} from "../../language/ast/workspace_index.ts";

describe("documentation template code action", () => {
  let document: TextDocument;
  let index: WorkspaceIndex;

  beforeEach(async () => {
    document = TextDocument.create(
      "file:///test.stan",
      "stan",
      7,
      "functions {\n  real foo(real x) { return x; }\n}",
    );
    index = createWorkspaceIndex();
    index = await upsertSemanticIndexEntry(index, document);
  });

  afterEach(() => {
    index?.entries.get(document.uri)?.tree.delete();
  });

  test("returns no actions for missing or stale indexed entries", () => {
    const params = {
      textDocument: { uri: document.uri },
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 },
      },
      context: { diagnostics: [] },
    };
    expect(handleCodeAction(document, params, false, createWorkspaceIndex())).toEqual([]);
    const newerDocument = TextDocument.create(
      document.uri,
      "stan",
      8,
      document.getText(),
    );
    expect(handleCodeAction(newerDocument, params, false, index)).toEqual([]);
  });

  test.each([false, true])(
    "returns the documentation action with the supported edit format (documentChanges: %j)",
    (supportsDocumentChanges) => {
      const actions = handleCodeAction(
        document,
        {
          textDocument: { uri: document.uri },
          range: {
            start: { line: 1, character: 7 },
            end: { line: 1, character: 7 },
          },
          context: { diagnostics: [] },
        },
        supportsDocumentChanges,
        index,
      );
      const edits = [{
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        },
        newText: "  /**\n   * @brief\n   *\n   * @param x\n   * @return\n   */\n",
      }];
      expect(actions).toEqual([{
        title: "Generate documentation template",
        kind: "refactor.rewrite",
        edit: supportsDocumentChanges
          ? {
              documentChanges: [{
                textDocument: { uri: document.uri, version: 7 },
                edits,
              }],
            }
          : { changes: { [document.uri]: edits } },
      }]);
    },
  );

  test("respects requested code action kinds", () => {
    const params = {
      textDocument: { uri: document.uri },
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 },
      },
      context: { diagnostics: [] },
    };

    // No filter: the action is available.
    expect(handleCodeAction(document, params, false, index)).toHaveLength(1);

    // Matching categories: the action is available.
    for (const only of [["refactor"], ["refactor.rewrite"], [""]]) {
      expect(handleCodeAction(
        document,
        { ...params, context: { diagnostics: [], only } },
        false,
        index,
      )).toHaveLength(1);
    }

    // Empty or unrelated filters: no action is available.
    for (const only of [[], ["quickfix"], ["source"], ["refactor.extract"]]) {
      expect(handleCodeAction(
        document,
        { ...params, context: { diagnostics: [], only } },
        false,
        index,
      )).toEqual([]);
    }
  });

  test("converts both selection endpoints to offsets", () => {
    const params = {
      textDocument: { uri: document.uri },
      context: { diagnostics: [] },
    };

    // Select exactly the signature: "real foo(real x)".
    expect(handleCodeAction(
      document,
      {
        ...params,
        range: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 18 },
        },
      },
      false,
      index,
    )).toHaveLength(1);

    // Start in the signature, but extend into the body.
    expect(handleCodeAction(
      document,
      {
        ...params,
        range: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 27 },
        },
      },
      false,
      index,
    )).toEqual([]);

    // Place the cursor on "return", inside the body.
    expect(handleCodeAction(
      document,
      {
        ...params,
        range: {
          start: { line: 1, character: 21 },
          end: { line: 1, character: 21 },
        },
      },
      false,
      index,
    )).toEqual([]);
  });

  test.each(["\n", "\r\n", "\r"])(
    "converts UTF-16 offsets and insertion ranges with %j line endings",
    async (newline) => {
      const text = [
        "/* 😀 café */",
        "functions {",
        "  real foo(real x) { return x; }",
        "}",
      ].join(newline);
      const document = TextDocument.create(
        "file:///test.stan",
        "stan",
        7,
        text,
      );
      const index = await upsertSemanticIndexEntry(
        createWorkspaceIndex(),
        document,
      );

      try {
        const actions = handleCodeAction(
          document,
          {
            textDocument: { uri: document.uri },
            range: {
              start: { line: 2, character: 7 },
              end: { line: 2, character: 7 },
            },
            context: { diagnostics: [] },
          },
          false,
          index,
        );

        expect(actions[0]?.edit?.changes?.[document.uri]?.[0]).toEqual({
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 0 },
          },
          newText: [
            "  /**",
            "   * @brief",
            "   *",
            "   * @param x",
            "   * @return",
            "   */",
            "",
          ].join(newline),
        });
      } finally {
        index.entries.get(document.uri)!.tree.delete();
      }
    },
  );
});
