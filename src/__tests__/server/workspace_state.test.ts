import { describe, expect, it, mock } from "bun:test";
import type {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
} from "vscode-languageserver/node";
import { getSemanticIndexEntry } from "../../language/ast/workspace_index";
import {
  changeWorkspaceDocument,
  closeWorkspaceDocument,
  createServerWorkspaceState,
  forceWorkspaceIndexUpdate,
  openWorkspaceDocument,
  type WorkspaceIndexUpdateOptions,
} from "../../server/workspace_state";

const uri = "file:///workspace/model.stan";

const options = (): WorkspaceIndexUpdateOptions => ({
  debounceMs: 60_000,
  reportError: mock((_uri: string, _error: unknown) => undefined),
});

const openParams = (
  text = "parameters { real a; }",
  version = 1,
): DidOpenTextDocumentParams => ({
  textDocument: {
    uri,
    languageId: "stan",
    version,
    text,
  },
});

const changeParams = (
  version: number,
  start: number,
  end: number,
  text: string,
): DidChangeTextDocumentParams => ({
  textDocument: { uri, version },
  contentChanges: [{
    range: {
      start: { line: 0, character: start },
      end: { line: 0, character: end },
    },
    rangeLength: end - start,
    text,
  }],
});

const closeParams = (): DidCloseTextDocumentParams => ({
  textDocument: { uri },
});

describe("server workspace state", () => {
  it("owns document and workspace-index state", async () => {
    const state = createServerWorkspaceState();
    const updateOptions = options();

    openWorkspaceDocument(state, openParams(), updateOptions);
    const openedDocument = state.documents.get(uri);
    if (!openedDocument) {
      throw new Error("Expected document to be open");
    }

    expect(openedDocument.getText()).toBe("parameters { real a; }");
    expect(state.indexing.pendingUpdates.get(uri)?.version).toBe(1);

    await forceWorkspaceIndexUpdate(state, openedDocument, updateOptions);

    expect(
      getSemanticIndexEntry(state.indexing.index, openedDocument),
    ).not.toBeNull();
    expect(state.indexing.pendingUpdates.has(uri)).toBeFalse();

    closeWorkspaceDocument(state, closeParams());

    expect(state.documents.has(uri)).toBeFalse();
    expect(state.indexing.index.entries.has(uri)).toBeFalse();
    expect(state.indexing.pendingUpdates.has(uri)).toBeFalse();
    expect(state.indexing.changeHistory.has(uri)).toBeFalse();
  });

  it("preserves ordered changes until latest document is indexed", async () => {
    const state = createServerWorkspaceState();
    const updateOptions = options();

    openWorkspaceDocument(state, openParams(), updateOptions);
    const openedDocument = state.documents.get(uri);
    if (!openedDocument) {
      throw new Error("Expected document to be open");
    }
    await forceWorkspaceIndexUpdate(state, openedDocument, updateOptions);

    changeWorkspaceDocument(
      state,
      changeParams(2, 18, 19, "alpha"),
      updateOptions,
    );
    const firstChange = state.indexing.changeHistory.get(uri)?.[0];
    const pendingUpdate = state.indexing.pendingUpdates.get(uri);

    changeWorkspaceDocument(
      state,
      changeParams(3, 18, 23, "beta"),
      updateOptions,
    );
    const secondChange = state.indexing.changeHistory.get(uri)?.[1];
    const latestDocument = state.documents.get(uri);
    if (!firstChange || !secondChange || !latestDocument) {
      throw new Error("Expected both document changes to be retained");
    }

    expect(state.indexing.pendingUpdates.get(uri)).toBe(pendingUpdate);
    expect(state.indexing.pendingUpdates.get(uri)?.version).toBe(3);
    expect(state.indexing.changeHistory.get(uri)).toEqual([
      firstChange,
      secondChange,
    ]);

    await forceWorkspaceIndexUpdate(
      state,
      latestDocument,
      updateOptions,
    );

    expect(
      getSemanticIndexEntry(state.indexing.index, latestDocument),
    ).not.toBeNull();
    expect(state.indexing.changeHistory.has(uri)).toBeFalse();
    expect(state.indexing.pendingUpdates.has(uri)).toBeFalse();
  });
});
