import { describe, expect, it, mock } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createWorkspaceIndex,
  getSemanticIndexEntry,
  removeSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../../../language/ast/workspace_index";

describe("workspace index", () => {
  it("returns a cache hit when the URI and version are unchanged", async () => {
    const document = TextDocument.create("file:///a.stan", "stan", 1, "parameters { real alpha; }");
    const tree = { id: "tree-v1" } as any;
    const parseDocument = mock(async () => tree);

    const first = await upsertSemanticIndexEntry(createWorkspaceIndex(), document, parseDocument);
    const firstEntry = getSemanticIndexEntry(first, document);
    const second = await upsertSemanticIndexEntry(first, document, parseDocument);

    expect(parseDocument).toHaveBeenCalledTimes(1);
    expect(getSemanticIndexEntry(second, document)).toBe(firstEntry);
    expect(firstEntry?.semanticIndex.lines).toEqual(["parameters { real alpha; }"]);
  });

  it("rebuilds when the document version changes and reuses the previous tree", async () => {
    const v1 = TextDocument.create("file:///a.stan", "stan", 1, "parameters { real alpha; }");
    const v2 = TextDocument.create("file:///a.stan", "stan", 2, "parameters { real beta; }");
    const tree1 = { id: "tree-v1" } as any;
    const tree2 = { id: "tree-v2" } as any;
    const parseDocument = mock(async (_text: string, oldTree?: unknown) => {
      return oldTree === undefined ? tree1 : tree2;
    });

    const first = await upsertSemanticIndexEntry(createWorkspaceIndex(), v1, parseDocument);
    const second = await upsertSemanticIndexEntry(first, v2, parseDocument);
    const secondEntry = getSemanticIndexEntry(second, v2);

    expect(parseDocument).toHaveBeenCalledTimes(2);
    expect(parseDocument.mock.calls[1]).toEqual([v2.getText(), tree1]);
    expect(secondEntry?.version).toBe(2);
    expect(secondEntry?.text).toBe(v2.getText());
    expect(secondEntry?.tree).toBe(tree2);
  });

  it("isolates cache entries by URI", async () => {
    const a1 = TextDocument.create("file:///a.stan", "stan", 1, "parameters { real alpha; }");
    const b1 = TextDocument.create("file:///b.stan", "stan", 1, "parameters { real beta; }");
    const b2 = TextDocument.create("file:///b.stan", "stan", 2, "parameters { real gamma; }");
    const treeA = { id: "tree-a" } as any;
    const treeB1 = { id: "tree-b1" } as any;
    const treeB2 = { id: "tree-b2" } as any;
    const parseDocument = mock(async (text: string, oldTree?: unknown) => {
      if (text.includes("alpha")) return treeA;
      if (oldTree === undefined) return treeB1;
      return treeB2;
    });

    const withA = await upsertSemanticIndexEntry(createWorkspaceIndex(), a1, parseDocument);
    const withB = await upsertSemanticIndexEntry(withA, b1, parseDocument);
    const updatedB = await upsertSemanticIndexEntry(withB, b2, parseDocument);

    expect(parseDocument.mock.calls[2]).toEqual([b2.getText(), treeB1]);
    expect(getSemanticIndexEntry(updatedB, a1)?.tree).toBe(treeA);
    expect(getSemanticIndexEntry(updatedB, b2)?.tree).toBe(treeB2);
  });

  it("removes entries by URI", async () => {
    const document = TextDocument.create("file:///a.stan", "stan", 1, "parameters { real alpha; }");
    const index = await upsertSemanticIndexEntry(
      createWorkspaceIndex(),
      document,
      async () => ({ id: "tree-v1" }) as any,
    );

    const removed = removeSemanticIndexEntry(index, document.uri);

    expect(getSemanticIndexEntry(removed, document)).toBeNull();
  });
});
