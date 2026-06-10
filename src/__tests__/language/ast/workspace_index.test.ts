import { describe, expect, it, mock } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createWorkspaceIndex,
  getSemanticIndexEntry,
  removeSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../../../language/ast/workspace_index";

describe("workspace index", () => {
  it("adds, caches, updates, and removes a semantic index entry", async () => {
    const document = TextDocument.create("file:///a.stan", "stan", 1, "parameters { real alpha; }");
    const editedDocument = TextDocument.create("file:///a.stan", "stan", 2, "parameters { real beta; }");
    const tree = { id: "tree-v1" } as any;
    const editedTree = { id: "tree-v2" } as any;
    let parseCount = 0;
    const parseDocument = mock(async (_text: string, _oldTree?: any) => {
      parseCount += 1;
      return parseCount === 1 ? tree : editedTree;
    });

    const emptyIndex = createWorkspaceIndex();
    const withEntry = await upsertSemanticIndexEntry(emptyIndex, document, parseDocument);
    const entry = getSemanticIndexEntry(withEntry, document);

    expect(entry).not.toBeNull();
    expect(entry?.uri).toBe(document.uri);
    expect(entry?.version).toBe(document.version);
    expect(entry?.text).toBe(document.getText());
    expect(entry?.tree).toBe(tree);

    const cachedIndex = await upsertSemanticIndexEntry(withEntry, document, parseDocument);
    const cachedEntry = getSemanticIndexEntry(cachedIndex, document);

    expect(parseDocument).toHaveBeenCalledTimes(1);
    expect(cachedIndex).toBe(withEntry);
    expect(cachedEntry).toBe(entry);

    const updatedIndex = await upsertSemanticIndexEntry(cachedIndex, editedDocument, parseDocument);
    const updatedEntry = getSemanticIndexEntry(updatedIndex, editedDocument);

    expect(parseDocument).toHaveBeenCalledTimes(2);
    expect(parseDocument.mock.calls[1]).toEqual([editedDocument.getText(), tree]);
    expect(updatedEntry).not.toBeNull();
    expect(updatedEntry).not.toBe(entry);
    expect(updatedEntry?.version).toBe(editedDocument.version);
    expect(updatedEntry?.text).toBe(editedDocument.getText());
    expect(updatedEntry?.tree).toBe(editedTree);

    const removedIndex = removeSemanticIndexEntry(updatedIndex, document.uri);

    expect(getSemanticIndexEntry(removedIndex, editedDocument)).toBeNull();
  });
});
