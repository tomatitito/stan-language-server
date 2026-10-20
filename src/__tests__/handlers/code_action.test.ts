import {
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
  type Mock,
} from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { SnippetTextEdit } from "vscode-languageserver";
import { handleCodeAction } from "../../handlers/code_action.ts";
import type {
  SemanticIndexEntry,
  WorkspaceIndex,
} from "../../language/ast/types.ts";
import * as providerModule from "../../language/documentation/provider.ts";

describe("documentation template code action", () => {
  let providerSpy: Mock<typeof providerModule.provideDocumentationTemplate>;

  beforeEach(() => {
    providerSpy = spyOn(
      providerModule,
      "provideDocumentationTemplate",
    ).mockReturnValue({
      offset: 12,
      newText: "  /**\n   * @brief\n   *\n   * @param x\n   * @return\n   */\n",
    });
  });

  afterEach(() => {
    providerSpy?.mockRestore();
  });

  test("returns no actions for missing or stale indexed entries", () => {
    const document = TextDocument.create(
      "file:///test.stan",
      "stan",
      7,
      "functions {\n  real foo(real x) { return x; }\n}",
    );
    // The handler forwards entries; only the provider may inspect their AST.
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: document.version,
      text: document.getText(),
      get tree(): SemanticIndexEntry["tree"] {
        throw new Error("Handler tests must not access a real parse tree");
      },
      get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
        throw new Error("Handler tests must not inspect the semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params = {
      textDocument: { uri: document.uri },
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 },
      },
      context: { diagnostics: [] },
    };
    expect(
      handleCodeAction(document, params, false, { entries: new Map() }, false),
    ).toEqual([]);
    expect(providerSpy).not.toHaveBeenCalled();
    const newerDocument = TextDocument.create(
      document.uri,
      "stan",
      8,
      document.getText(),
    );
    expect(
      handleCodeAction(newerDocument, params, false, index, false),
    ).toEqual([]);
    expect(providerSpy).not.toHaveBeenCalled();
  });

  test("returns no actions when the provider returns no template", () => {
    const document = TextDocument.create(
      "file:///test.stan",
      "stan",
      7,
      "functions {\n  real foo(real x) { return x; }\n}",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: document.version,
      text: document.getText(),
      get tree(): SemanticIndexEntry["tree"] {
        throw new Error("Handler tests must not access a real parse tree");
      },
      get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
        throw new Error("Handler tests must not inspect the semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    providerSpy.mockReturnValue(null);

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
      false,
      index,
      false,
    );

    expect(actions).toEqual([]);
    expect(providerSpy).toHaveBeenCalledTimes(1);
    expect(providerSpy).toHaveBeenCalledWith(entry, 19, 19);
  });

  test.each([false, true])(
    "returns the documentation action with the supported edit format (documentChanges: %j)",
    (supportsDocumentChanges) => {
      const document = TextDocument.create(
        "file:///test.stan",
        "stan",
        7,
        "functions {\n  real foo(real x) { return x; }\n}",
      );
      const entry: SemanticIndexEntry = {
        uri: document.uri,
        version: document.version,
        text: document.getText(),
        get tree(): SemanticIndexEntry["tree"] {
          throw new Error("Handler tests must not access a real parse tree");
        },
        get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
          throw new Error("Handler tests must not inspect the semantic index");
        },
      };
      const index: WorkspaceIndex = {
        entries: new Map([[document.uri, entry]]),
      };
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
        false,
      );
      const edits = [
        {
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 0 },
          },
          newText:
            "  /**\n   * @brief\n   *\n   * @param x\n   * @return\n   */\n",
        },
      ];
      expect(actions).toEqual([
        {
          title: "Generate documentation template",
          kind: "refactor.rewrite",
          edit: supportsDocumentChanges
            ? {
                documentChanges: [
                  {
                    textDocument: { uri: document.uri, version: 7 },
                    edits,
                  },
                ],
              }
            : { changes: { [document.uri]: edits } },
        },
      ]);
    },
  );

  test.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "uses a cursor snippet only with both capabilities (documentChanges: %j, snippetEdits: %j)",
    (supportsDocumentChanges, supportsSnippetEdits) => {
      const document = TextDocument.create(
        "file:///test.stan",
        "stan",
        7,
        "functions {\n  real foo(real x) { return x; }\n}",
      );
      const entry: SemanticIndexEntry = {
        uri: document.uri,
        version: document.version,
        text: document.getText(),
        get tree(): SemanticIndexEntry["tree"] {
          throw new Error("Handler tests must not access a real parse tree");
        },
        get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
          throw new Error("Handler tests must not inspect the semantic index");
        },
      };
      const index: WorkspaceIndex = {
        entries: new Map([[document.uri, entry]]),
      };
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
        supportsSnippetEdits,
      );
      const range = {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 0 },
      };
      const plainEdit = {
        range,
        newText:
          "  /**\n   * @brief\n   *\n   * @param x\n   * @return\n   */\n",
      };
      const snippetEdit: SnippetTextEdit = {
        range,
        snippet: {
          kind: "snippet",
          value:
            "  /**\n   * @brief $0\n   *\n   * @param x\n   * @return\n   */\n",
        },
      };
      expect(actions).toEqual([
        {
          title: "Generate documentation template",
          kind: "refactor.rewrite",
          edit: supportsDocumentChanges
            ? {
                documentChanges: [
                  {
                    textDocument: { uri: document.uri, version: 7 },
                    edits: [supportsSnippetEdits ? snippetEdit : plainEdit],
                  },
                ],
              }
            : { changes: { [document.uri]: [plainEdit] } },
        },
      ]);
    },
  );

  test("offers the action when the requested kinds include documentation generation", () => {
    const document = TextDocument.create(
      "file:///test.stan",
      "stan",
      7,
      "functions {\n  real foo(real x) { return x; }\n}",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: document.version,
      text: document.getText(),
      get tree(): SemanticIndexEntry["tree"] {
        throw new Error("Handler tests must not access a real parse tree");
      },
      get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
        throw new Error("Handler tests must not inspect the semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params = {
      textDocument: { uri: document.uri },
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 },
      },
      context: { diagnostics: [] },
    };

    // No filter: the action is available.
    expect(
      handleCodeAction(document, params, false, index, false),
    ).toHaveLength(1);
    expect(providerSpy).toHaveBeenCalledTimes(1);

    // Matching categories: the action is available.
    for (const only of [["refactor"], ["refactor.rewrite"], [""]]) {
      providerSpy.mockClear();
      expect(
        handleCodeAction(
          document,
          { ...params, context: { diagnostics: [], only } },
          false,
          index,
          false,
        ),
      ).toHaveLength(1);
      expect(providerSpy).toHaveBeenCalledTimes(1);
    }
  });

  test("returns no actions without calling the provider when the requested kinds exclude documentation generation", () => {
    const document = TextDocument.create(
      "file:///test.stan",
      "stan",
      7,
      "functions {\n  real foo(real x) { return x; }\n}",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: document.version,
      text: document.getText(),
      get tree(): SemanticIndexEntry["tree"] {
        throw new Error("Handler tests must not access a real parse tree");
      },
      get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
        throw new Error("Handler tests must not inspect the semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params = {
      textDocument: { uri: document.uri },
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 7 },
      },
      context: { diagnostics: [] },
    };

    // Empty or unrelated filters: no action is available.
    for (const only of [[], ["quickfix"], ["source"], ["refactor.extract"]]) {
      providerSpy.mockClear();
      expect(
        handleCodeAction(
          document,
          { ...params, context: { diagnostics: [], only } },
          false,
          index,
          false,
        ),
      ).toEqual([]);
      expect(providerSpy).not.toHaveBeenCalled();
    }
  });

  test.each([
    { start: 2, end: 18, startOffset: 14, endOffset: 30 },
    { start: 2, end: 27, startOffset: 14, endOffset: 39 },
    { start: 21, end: 21, startOffset: 33, endOffset: 33 },
  ])(
    "passes both selection endpoints to the provider: %j",
    ({ start, end, startOffset, endOffset }) => {
      const document = TextDocument.create(
        "file:///test.stan",
        "stan",
        7,
        "functions {\n  real foo(real x) { return x; }\n}",
      );
      const entry: SemanticIndexEntry = {
        uri: document.uri,
        version: document.version,
        text: document.getText(),
        get tree(): SemanticIndexEntry["tree"] {
          throw new Error("Handler tests must not access a real parse tree");
        },
        get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
          throw new Error("Handler tests must not inspect the semantic index");
        },
      };
      const index: WorkspaceIndex = {
        entries: new Map([[document.uri, entry]]),
      };
      // The provider, not the handler, decides whether a range is eligible.
      const actions = handleCodeAction(
        document,
        {
          textDocument: { uri: document.uri },
          range: {
            start: { line: 1, character: start },
            end: { line: 1, character: end },
          },
          context: { diagnostics: [] },
        },
        false,
        index,
        false,
      );

      expect(providerSpy).toHaveBeenCalledTimes(1);
      expect(providerSpy).toHaveBeenCalledWith(entry, startOffset, endOffset);
      expect(providerSpy.mock.calls[0]?.[0]).toBe(entry);
      expect(actions).toHaveLength(1);
    },
  );

  test.each([
    { newline: "\n", insertionOffset: 26, startOffset: 33, endOffset: 36 },
    { newline: "\r\n", insertionOffset: 28, startOffset: 35, endOffset: 38 },
    { newline: "\r", insertionOffset: 26, startOffset: 33, endOffset: 36 },
  ])(
    "converts UTF-16 offsets and insertion ranges with %j line endings",
    ({ newline, insertionOffset, startOffset, endOffset }) => {
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
      const entry: SemanticIndexEntry = {
        uri: document.uri,
        version: document.version,
        text: document.getText(),
        get tree(): SemanticIndexEntry["tree"] {
          throw new Error("Handler tests must not access a real parse tree");
        },
        get semanticIndex(): SemanticIndexEntry["semanticIndex"] {
          throw new Error("Handler tests must not inspect the semantic index");
        },
      };
      const index: WorkspaceIndex = {
        entries: new Map([[document.uri, entry]]),
      };
      // A deliberately fixed provider result: the handler must preserve this
      // text and translate its insertion offset, not generate documentation.
      const templateText = ["  /**", "   * @brief", "   */", ""].join(newline);
      providerSpy.mockReturnValue({
        offset: insertionOffset,
        newText: templateText,
      });

      const actions = handleCodeAction(
        document,
        {
          textDocument: { uri: document.uri },
          range: {
            start: { line: 2, character: 7 },
            end: { line: 2, character: 10 },
          },
          context: { diagnostics: [] },
        },
        false,
        index,
        false,
      );

      expect(providerSpy).toHaveBeenCalledTimes(1);
      expect(providerSpy).toHaveBeenCalledWith(entry, startOffset, endOffset);
      expect(actions[0]?.edit?.changes?.[document.uri]?.[0]).toEqual({
        range: {
          start: { line: 2, character: 0 },
          end: { line: 2, character: 0 },
        },
        newText: templateText,
      });
    },
  );
});
