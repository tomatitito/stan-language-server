import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
} from "vscode-languageserver/node";
import {
  createWorkspaceIndex,
  removeSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../language/ast/workspace_index.ts";
import type { WorkspaceIndex } from "../language/ast/types.ts";
import {
  changeDocument,
  closeDocument,
  emptyDocumentState,
  openDocument,
  type DocumentChange,
  type DocumentState,
} from "./document_state.ts";

export type PendingWorkspaceIndexUpdate = {
  timer?: ReturnType<typeof setTimeout>;
  version: number;
  promise: Promise<void>;
  resolve: () => void;
};

export type WorkspaceIndexingState = {
  index: WorkspaceIndex;
  update: Promise<void>;
  pendingUpdates: Map<string, PendingWorkspaceIndexUpdate>;
  changeHistory: Map<string, DocumentChange[]>;
};

export type ServerWorkspaceState = {
  documents: DocumentState;
  indexing: WorkspaceIndexingState;
};

export type WorkspaceIndexUpdateOptions = {
  debounceMs: number;
  reportError: (uri: string, error: unknown) => void;
};

export const createServerWorkspaceState = (): ServerWorkspaceState => ({
  documents: emptyDocumentState(),
  indexing: {
    index: createWorkspaceIndex(),
    update: Promise.resolve(),
    pendingUpdates: new Map(),
    changeHistory: new Map(),
  },
});

const isStanDocument = (document: TextDocument): boolean => {
  return document.languageId.startsWith("stan");
};

const consumeChanges = (
  state: WorkspaceIndexingState,
  uri: string,
  changes: readonly DocumentChange[],
): WorkspaceIndexingState => {
  const currentHistory = state.changeHistory.get(uri);
  if (
    !currentHistory
    || !changes.every((change, index) => currentHistory[index] === change)
  ) {
    return state;
  }

  const remainingChanges = currentHistory.slice(changes.length);
  if (remainingChanges.length === 0) {
    state.changeHistory.delete(uri);
  } else {
    state.changeHistory.set(uri, remainingChanges);
  }
  return state;
};

const runWorkspaceIndexUpdate = async (
  state: ServerWorkspaceState,
  uri: string,
  options: WorkspaceIndexUpdateOptions,
): Promise<ServerWorkspaceState> => {
  state.indexing.update = state.indexing.update
    .catch(() => undefined)
    .then(async () => {
      const latestDocument = state.documents.get(uri);
      if (!latestDocument || !isStanDocument(latestDocument)) {
        return;
      }

      const changes = [...(state.indexing.changeHistory.get(uri) ?? [])];
      const nextIndex = await upsertSemanticIndexEntry(
        state.indexing.index,
        latestDocument,
        changes,
      );
      if (state.documents.get(uri) === latestDocument) {
        state.indexing.index = nextIndex;
        consumeChanges(state.indexing, uri, changes);
      }
    })
    .catch((error: unknown) => {
      options.reportError(uri, error);
    });

  await state.indexing.update;
  return state;
};

const queueWorkspaceIndexUpdate = (
  state: ServerWorkspaceState,
  document: TextDocument,
  options: WorkspaceIndexUpdateOptions,
  change?: DocumentChange,
): ServerWorkspaceState => {
  const uri = document.uri;
  if (change) {
    const changes = state.indexing.changeHistory.get(uri) ?? [];
    state.indexing.changeHistory.set(uri, [...changes, change]);
  }

  const existingUpdate = state.indexing.pendingUpdates.get(uri);
  if (existingUpdate?.timer) {
    clearTimeout(existingUpdate.timer);
  }

  const createPendingUpdate = (): PendingWorkspaceIndexUpdate => {
    let resolve!: () => void;
    const promise = new Promise<void>((resolver) => {
      resolve = resolver;
    });
    return {
      version: document.version,
      promise,
      resolve,
    };
  };

  const pendingUpdate = existingUpdate ?? createPendingUpdate();
  pendingUpdate.version = document.version;
  pendingUpdate.timer = setTimeout(() => {
    if (state.indexing.pendingUpdates.get(uri) !== pendingUpdate) {
      return;
    }
    state.indexing.pendingUpdates.delete(uri);
    void runWorkspaceIndexUpdate(state, uri, options).finally(
      pendingUpdate.resolve,
    );
  }, options.debounceMs);
  state.indexing.pendingUpdates.set(uri, pendingUpdate);

  return state;
};

const clearWorkspaceIndexUpdate = (
  state: ServerWorkspaceState,
  uri: string,
): ServerWorkspaceState => {
  const pendingUpdate = state.indexing.pendingUpdates.get(uri);
  if (pendingUpdate?.timer) {
    clearTimeout(pendingUpdate.timer);
  }
  if (pendingUpdate) {
    state.indexing.pendingUpdates.delete(uri);
    pendingUpdate.resolve();
  }
  state.indexing.changeHistory.delete(uri);
  return state;
};

export const openWorkspaceDocument = (
  state: ServerWorkspaceState,
  params: DidOpenTextDocumentParams,
  options: WorkspaceIndexUpdateOptions,
): ServerWorkspaceState => {
  const transition = openDocument(state.documents, params);
  state.documents = transition.state;
  if (transition.accepted) {
    state.indexing.changeHistory.delete(transition.value.uri);
    void queueWorkspaceIndexUpdate(
      state,
      transition.value,
      options,
    );
  }
  return state;
};

export const changeWorkspaceDocument = (
  state: ServerWorkspaceState,
  params: DidChangeTextDocumentParams,
  options: WorkspaceIndexUpdateOptions,
): ServerWorkspaceState => {
  const transition = changeDocument(state.documents, params);
  state.documents = transition.state;
  if (transition.accepted) {
    void queueWorkspaceIndexUpdate(
      state,
      transition.value.document,
      options,
      transition.value,
    );
  }
  return state;
};

export const closeWorkspaceDocument = (
  state: ServerWorkspaceState,
  params: DidCloseTextDocumentParams,
): ServerWorkspaceState => {
  const transition = closeDocument(state.documents, params);
  state.documents = transition.state;
  if (transition.accepted) {
    clearWorkspaceIndexUpdate(state, transition.value.uri);
    state.indexing.index = removeSemanticIndexEntry(
      state.indexing.index,
      transition.value.uri,
    );
  }
  return state;
};

export const forceWorkspaceIndexUpdate = async (
  state: ServerWorkspaceState,
  document: TextDocument,
  options: WorkspaceIndexUpdateOptions,
): Promise<ServerWorkspaceState> => {
  const pendingUpdate = state.indexing.pendingUpdates.get(document.uri);
  if (pendingUpdate) {
    if (pendingUpdate.timer) {
      clearTimeout(pendingUpdate.timer);
    }
    state.indexing.pendingUpdates.delete(document.uri);
    await runWorkspaceIndexUpdate(state, document.uri, options);
    pendingUpdate.resolve();
  } else {
    await state.indexing.update;
  }

  const changes = [...(
    state.indexing.changeHistory.get(document.uri) ?? []
  )];
  state.indexing.index = await upsertSemanticIndexEntry(
    state.indexing.index,
    document,
    changes,
  );
  if (state.documents.get(document.uri) === document) {
    state.indexing.changeHistory.delete(document.uri);
  }
  return state;
};
