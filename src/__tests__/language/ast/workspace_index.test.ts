import { describe, expect, it, mock } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Edit, Tree } from "web-tree-sitter";
import type { DocumentChange } from "../../../server/document_state";
import {
  createWorkspaceIndex,
  getSemanticIndexEntry,
  removeSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../../../language/ast/workspace_index";

describe("workspace index", () => {
  it("adds, caches, updates, and removes a semantic index entry", async () => {
    const document = TextDocument.create(
      "file:///a.stan",
      "stan",
      1,
      "parameters { real alpha; }",
    );
    const editedDocument = TextDocument.create(
      "file:///a.stan",
      "stan",
      2,
      "parameters { real beta; }",
    );
    const tree = { id: "tree-v1" } as any;
    const editedTree = { id: "tree-v2" } as any;
    let parseCount = 0;
    const parseDocument = mock(async (_text: string, _oldTree?: any) => {
      parseCount += 1;
      return parseCount === 1 ? tree : editedTree;
    });

    const emptyIndex = createWorkspaceIndex();
    const withEntry = await upsertSemanticIndexEntry(
      emptyIndex,
      document,
      [],
      parseDocument,
    );
    const entry = getSemanticIndexEntry(withEntry, document);

    expect(entry).not.toBeNull();
    expect(entry?.uri).toBe(document.uri);
    expect(entry?.version).toBe(document.version);
    expect(entry?.text).toBe(document.getText());
    expect(entry?.tree).toBe(tree);

    const cachedIndex = await upsertSemanticIndexEntry(
      withEntry,
      document,
      [],
      parseDocument,
    );
    const cachedEntry = getSemanticIndexEntry(cachedIndex, document);

    expect(parseDocument).toHaveBeenCalledTimes(1);
    expect(parseDocument.mock.calls[0]).toEqual([document.getText()]);
    expect(cachedIndex).toBe(withEntry);
    expect(cachedEntry).toBe(entry);

    const updatedIndex = await upsertSemanticIndexEntry(
      cachedIndex,
      editedDocument,
      [],
      parseDocument,
    );
    const updatedEntry = getSemanticIndexEntry(updatedIndex, editedDocument);

    expect(parseDocument).toHaveBeenCalledTimes(2);
    expect(parseDocument.mock.calls[1]).toEqual([editedDocument.getText()]);
    expect(updatedEntry).not.toBeNull();
    expect(updatedEntry).not.toBe(entry);
    expect(updatedEntry?.version).toBe(editedDocument.version);
    expect(updatedEntry?.text).toBe(editedDocument.getText());
    expect(updatedEntry?.tree).toBe(editedTree);

    const removedIndex = removeSemanticIndexEntry(updatedIndex, document.uri);

    expect(getSemanticIndexEntry(removedIndex, editedDocument)).toBeNull();
  });

  it("applies ordered document changes to a copied tree before parsing", async () => {
    const uri = "file:///model.stan";
    const version1 = TextDocument.create(uri, "stan", 1, "α bom x");
    const version2 = TextDocument.create(uri, "stan", 2, "α blackjacxk x");
    const version3 = TextDocument.create(uri, "stan", 3, "α blackjacxk result");
    const firstChange: DocumentChange = {
      previousDocument: version1,
      document: version2,
      contentChanges: [
        {
          range: {
            start: { line: 0, character: 2 },
            end: { line: 0, character: 5 },
          },
          rangeLength: 3,
          text: "blackjacxk",
        },
      ],
    };
    const secondChange: DocumentChange = {
      previousDocument: version2,
      document: version3,
      contentChanges: [
        {
          range: {
            start: { line: 0, character: 13 },
            end: { line: 0, character: 14 },
          },
          rangeLength: 1,
          text: "result",
        },
      ],
    };
    const edit = mock((_inputEdit: Edit) => undefined);
    const copiedTree = { edit } as unknown as Tree;
    const copy = mock(() => copiedTree);
    const version1Tree = { copy } as unknown as Tree;
    const version3Tree = { id: "tree-v3" } as unknown as Tree;
    let parseCount = 0;
    const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
      parseCount += 1;
      return parseCount === 1 ? version1Tree : version3Tree;
    });
    const index = await upsertSemanticIndexEntry(
      createWorkspaceIndex(),
      version1,
      [],
      parseDocument,
    );
    const updatedIndex = await upsertSemanticIndexEntry(
      index,
      version3,
      [firstChange, secondChange],
      parseDocument,
    );

    expect(copy).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(2);
    expect(
      edit.mock.calls.map(([inputEdit]) => ({
        startIndex: inputEdit.startIndex,
        oldEndIndex: inputEdit.oldEndIndex,
        newEndIndex: inputEdit.newEndIndex,
        startPosition: inputEdit.startPosition,
        oldEndPosition: inputEdit.oldEndPosition,
        newEndPosition: inputEdit.newEndPosition,
      })),
    ).toEqual([
      {
        startIndex: 3,
        oldEndIndex: 6,
        newEndIndex: 13,
        startPosition: { row: 0, column: 3 },
        oldEndPosition: { row: 0, column: 6 },
        newEndPosition: { row: 0, column: 13 },
      },
      {
        startIndex: 14,
        oldEndIndex: 15,
        newEndIndex: 20,
        startPosition: { row: 0, column: 14 },
        oldEndPosition: { row: 0, column: 15 },
        newEndPosition: { row: 0, column: 20 },
      },
    ]);
    expect(parseDocument.mock.calls[1]).toEqual([
      version3.getText(),
      copiedTree,
    ]);
    expect(getSemanticIndexEntry(updatedIndex, version3)?.tree).toBe(
      version3Tree,
    );
  });

  it("converts multiple ranged changes against sequential intermediate text", async () => {
    const uri = "file:///unicode.stan";
    const version1 = TextDocument.create(
      uri,
      "stan",
      1,
      "α\nreal café;\nreal x;",
    );
    const version2 = TextDocument.create(
      uri,
      "stan",
      2,
      "α\nreal naïve;\nreal result;",
    );
    const changes: DocumentChange[] = [
      {
        previousDocument: version1,
        document: version2,
        contentChanges: [
          {
            range: {
              start: { line: 1, character: 5 },
              end: { line: 1, character: 9 },
            },
            rangeLength: 4,
            text: "naïve",
          },
          {
            range: {
              start: { line: 2, character: 5 },
              end: { line: 2, character: 6 },
            },
            rangeLength: 1,
            text: "result",
          },
        ],
      },
    ];
    const edit = mock((_inputEdit: Edit) => undefined);
    const copiedTree = { edit } as unknown as Tree;
    const copy = mock(() => copiedTree);
    const version1Tree = { copy } as unknown as Tree;
    const version2Tree = { id: "tree-v2" } as unknown as Tree;
    let parseCount = 0;
    const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
      parseCount += 1;
      return parseCount === 1 ? version1Tree : version2Tree;
    });

    const index = await upsertSemanticIndexEntry(
      createWorkspaceIndex(),
      version1,
      [],
      parseDocument,
    );
    await upsertSemanticIndexEntry(index, version2, changes, parseDocument);

    // Tree-sitter positions use UTF-8 bytes. The leading `α` occupies two
    // bytes, so absolute byte indices differ from LSP UTF-16 characters.
    expect(
      edit.mock.calls.map(([inputEdit]) => ({
        startIndex: inputEdit.startIndex,
        oldEndIndex: inputEdit.oldEndIndex,
        newEndIndex: inputEdit.newEndIndex,
        startPosition: inputEdit.startPosition,
        oldEndPosition: inputEdit.oldEndPosition,
        newEndPosition: inputEdit.newEndPosition,
      })),
    ).toEqual([
      // First edit, row 1:
      //   before:
      //     real café;
      //          ^---^  columns 5..10, indices 8..13
      //   after:
      //     real naïve;
      //          ^----^ columns 5..11, indices 8..14
      {
        startIndex: 8,
        oldEndIndex: 13,
        newEndIndex: 14,
        startPosition: { row: 1, column: 5 },
        oldEndPosition: { row: 1, column: 10 },
        newEndPosition: { row: 1, column: 11 },
      },
      // Second edit is calculated against text after first edit, row 2:
      //   before:
      //     real x;
      //          ^^     columns 5..6, indices 21..22
      //   after:
      //     real result;
      //          ^-----^ columns 5..11, indices 21..27
      {
        startIndex: 21,
        oldEndIndex: 22,
        newEndIndex: 27,
        startPosition: { row: 2, column: 5 },
        oldEndPosition: { row: 2, column: 6 },
        newEndPosition: { row: 2, column: 11 },
      },
    ]);
    expect(parseDocument.mock.calls[1]).toEqual([
      version2.getText(),
      copiedTree,
    ]);
  });

  describe("fresh parsing fallbacks", () => {
    const fallbackCases: Array<{
      name: string;
      changes: (
        previousDocument: TextDocument,
        document: TextDocument,
      ) => readonly DocumentChange[];
    }> = [
      {
        name: "missing change metadata",
        changes: () => [],
      },
      {
        name: "a full-document replacement",
        changes: (previousDocument, document) => [
          {
            previousDocument,
            document,
            contentChanges: [{ text: document.getText() }],
          },
        ],
      },
      {
        name: "a stale starting version",
        changes: (_previousDocument, document) => [
          {
            previousDocument: TextDocument.create(
              document.uri,
              "stan",
              0,
              "parameters { real alpha; }",
            ),
            document,
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 18 },
                  end: { line: 0, character: 23 },
                },
                text: "beta",
              },
            ],
          },
        ],
      },
      {
        name: "a non-contiguous revision chain",
        changes: (previousDocument, document) => {
          const version2 = TextDocument.create(
            document.uri,
            "stan",
            2,
            "parameters { real gamma; }",
          );
          const version4 = TextDocument.create(
            document.uri,
            "stan",
            4,
            document.getText(),
          );
          return [
            {
              previousDocument,
              document: version2,
              contentChanges: [
                {
                  range: {
                    start: { line: 0, character: 18 },
                    end: { line: 0, character: 23 },
                  },
                  text: "gamma",
                },
              ],
            },
            {
              previousDocument: version4,
              document,
              contentChanges: [
                {
                  range: {
                    start: { line: 0, character: 18 },
                    end: { line: 0, character: 23 },
                  },
                  text: "beta",
                },
              ],
            },
          ];
        },
      },
      {
        name: "mismatched previous text",
        changes: (_previousDocument, document) => [
          {
            previousDocument: TextDocument.create(
              document.uri,
              "stan",
              1,
              "parameters { real other; }",
            ),
            document,
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 18 },
                  end: { line: 0, character: 23 },
                },
                text: "beta",
              },
            ],
          },
        ],
      },
      {
        name: "an unsafe range",
        changes: (previousDocument, document) => [
          {
            previousDocument,
            document,
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 100 },
                  end: { line: 0, character: 105 },
                },
                rangeLength: 5,
                text: "beta",
              },
            ],
          },
        ],
      },
      {
        name: "a mismatched range length",
        changes: (previousDocument, document) => [
          {
            previousDocument,
            document,
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 18 },
                  end: { line: 0, character: 23 },
                },
                rangeLength: 4,
                text: "beta",
              },
            ],
          },
        ],
      },
      {
        name: "changes that do not produce the batch document text",
        changes: (previousDocument, document) => [
          {
            previousDocument,
            document,
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 18 },
                  end: { line: 0, character: 23 },
                },
                rangeLength: 5,
                text: "gamma",
              },
            ],
          },
        ],
      },
      {
        name: "a revision chain that does not reach the requested version",
        changes: (previousDocument, document) => [
          {
            previousDocument,
            document: TextDocument.create(
              document.uri,
              document.languageId,
              2,
              document.getText(),
            ),
            contentChanges: [
              {
                range: {
                  start: { line: 0, character: 18 },
                  end: { line: 0, character: 23 },
                },
                rangeLength: 5,
                text: "beta",
              },
            ],
          },
        ],
      },
    ];

    for (const fallbackCase of fallbackCases) {
      it(`fresh-parses without mutating the cached tree for ${fallbackCase.name}`, async () => {
        const uri = "file:///fallback.stan";
        const version1 = TextDocument.create(
          uri,
          "stan",
          1,
          "parameters { real alpha; }",
        );
        const version3 = TextDocument.create(
          uri,
          "stan",
          3,
          "parameters { real beta; }",
        );
        const cachedEdit = mock((_inputEdit: Edit) => undefined);
        const copiedEdit = mock((_inputEdit: Edit) => undefined);
        const copiedTree = { edit: copiedEdit } as unknown as Tree;
        const cachedTree = {
          copy: mock(() => copiedTree),
          edit: cachedEdit,
        } as unknown as Tree;
        const freshTree = { id: "fresh-tree" } as unknown as Tree;
        let parseCount = 0;
        const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
          parseCount += 1;
          return parseCount === 1 ? cachedTree : freshTree;
        });
        const index = await upsertSemanticIndexEntry(
          createWorkspaceIndex(),
          version1,
          [],
          parseDocument,
        );

        const updatedIndex = await upsertSemanticIndexEntry(
          index,
          version3,
          fallbackCase.changes(version1, version3),
          parseDocument,
        );

        expect(cachedEdit).not.toHaveBeenCalled();
        expect(parseDocument.mock.calls[1]).toEqual([version3.getText()]);
        expect(getSemanticIndexEntry(updatedIndex, version3)?.tree).toBe(
          freshTree,
        );
      });
    }

    it("fresh-parses when a change range splits a UTF-16 surrogate pair", async () => {
      const uri = "file:///surrogate-fallback.stan";
      const version1 = TextDocument.create(uri, "stan", 1, "real 😀alpha;");
      const version2 = TextDocument.create(uri, "stan", 2, "real beta;");
      const changes: DocumentChange[] = [
        {
          previousDocument: version1,
          document: version2,
          contentChanges: [
            {
              range: {
                start: { line: 0, character: 6 },
                end: { line: 0, character: 7 },
              },
              rangeLength: 1,
              text: "beta",
            },
          ],
        },
      ];
      const cachedEdit = mock((_inputEdit: Edit) => undefined);
      const cachedTree = {
        copy: mock(() => ({ edit: mock(() => undefined) }) as unknown as Tree),
        edit: cachedEdit,
      } as unknown as Tree;
      const freshTree = { id: "fresh-tree" } as unknown as Tree;
      let parseCount = 0;
      const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
        parseCount += 1;
        return parseCount === 1 ? cachedTree : freshTree;
      });
      const index = await upsertSemanticIndexEntry(
        createWorkspaceIndex(),
        version1,
        [],
        parseDocument,
      );

      const updatedIndex = await upsertSemanticIndexEntry(
        index,
        version2,
        changes,
        parseDocument,
      );

      expect(cachedTree.copy).not.toHaveBeenCalled();
      expect(cachedEdit).not.toHaveBeenCalled();
      expect(parseDocument.mock.calls[1]).toEqual([version2.getText()]);
      expect(getSemanticIndexEntry(updatedIndex, version2)?.tree).toBe(
        freshTree,
      );
    });

    describe("tree preparation failures", () => {
      const treePreparationFailureCases = [
        {
          name: "copying the cached tree throws",
          createCachedTree: () =>
            ({
              copy: mock(() => {
                throw new Error("copy failed");
              }),
            }) as unknown as Tree,
        },
        {
          name: "editing the copied tree throws",
          createCachedTree: () =>
            ({
              copy: mock(
                () =>
                  ({
                    edit: mock(() => {
                      throw new Error("edit failed");
                    }),
                  }) as unknown as Tree,
              ),
            }) as unknown as Tree,
        },
      ];

      for (const failureCase of treePreparationFailureCases) {
        it(`fresh-parses when ${failureCase.name}`, async () => {
          const uri = "file:///tree-preparation-fallback.stan";
          const version1 = TextDocument.create(uri, "stan", 1, "real alpha;");
          const version2 = TextDocument.create(uri, "stan", 2, "real beta;");
          const changes: DocumentChange[] = [
            {
              previousDocument: version1,
              document: version2,
              contentChanges: [
                {
                  range: {
                    start: { line: 0, character: 5 },
                    end: { line: 0, character: 10 },
                  },
                  rangeLength: 5,
                  text: "beta",
                },
              ],
            },
          ];
          const cachedTree = failureCase.createCachedTree();
          const freshTree = { id: "fresh-tree" } as unknown as Tree;
          let parseCount = 0;
          const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
            parseCount += 1;
            return parseCount === 1 ? cachedTree : freshTree;
          });
          const index = await upsertSemanticIndexEntry(
            createWorkspaceIndex(),
            version1,
            [],
            parseDocument,
          );

          const updatedIndex = await upsertSemanticIndexEntry(
            index,
            version2,
            changes,
            parseDocument,
          );

          expect(parseDocument.mock.calls[1]).toEqual([version2.getText()]);
          expect(getSemanticIndexEntry(index, version1)?.tree).toBe(cachedTree);
          expect(getSemanticIndexEntry(updatedIndex, version2)?.tree).toBe(
            freshTree,
          );
        });
      }
    });
  });

  it("does not mutate the cached tree when incremental parsing fails", async () => {
    const uri = "file:///parse-failure.stan";
    const version1 = TextDocument.create(uri, "stan", 1, "real alpha;");
    const version2 = TextDocument.create(uri, "stan", 2, "real beta;");
    const changes: DocumentChange[] = [
      {
        previousDocument: version1,
        document: version2,
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 5 },
              end: { line: 0, character: 10 },
            },
            rangeLength: 5,
            text: "beta",
          },
        ],
      },
    ];
    const cachedEdit = mock((_inputEdit: Edit) => undefined);
    const copiedEdit = mock((_inputEdit: Edit) => undefined);
    const copiedTree = { edit: copiedEdit } as unknown as Tree;
    const cachedTree = {
      copy: mock(() => copiedTree),
      edit: cachedEdit,
    } as unknown as Tree;
    let parseCount = 0;
    const parseDocument = mock(async (_text: string, _oldTree?: Tree) => {
      parseCount += 1;
      if (parseCount === 1) {
        return cachedTree;
      }
      throw new Error("parse failed");
    });
    const index = await upsertSemanticIndexEntry(
      createWorkspaceIndex(),
      version1,
      [],
      parseDocument,
    );

    await expect(
      upsertSemanticIndexEntry(index, version2, changes, parseDocument),
    ).rejects.toThrow("parse failed");

    expect(cachedEdit).not.toHaveBeenCalled();
    expect(copiedEdit).toHaveBeenCalledTimes(1);
    expect(getSemanticIndexEntry(index, version1)?.tree).toBe(cachedTree);
  });
});
