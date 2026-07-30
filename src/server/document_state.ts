import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
} from "vscode-languageserver/node";

export type DocumentState = ReadonlyMap<string, TextDocument>;

export type DocumentContentChange =
  DidChangeTextDocumentParams["contentChanges"][number];

export type DocumentChange = {
  previousDocument: TextDocument;
  document: TextDocument;
  contentChanges: readonly DocumentContentChange[];
};

export type DocumentTransitionRejection =
  | "already-open"
  | "not-open"
  | "invalid-version"
  | "stale-version"
  | "empty-change";

export type DocumentTransition<T> =
  | { accepted: true; state: DocumentState; value: T }
  | {
      accepted: false;
      state: DocumentState;
      reason: DocumentTransitionRejection;
    };

const cloneContentChange = (
  change: DocumentContentChange,
): DocumentContentChange => {
  if (!("range" in change)) {
    return { ...change };
  }

  return {
    ...change,
    range: {
      start: { ...change.range.start },
      end: { ...change.range.end },
    },
  };
};

export const emptyDocumentState = (): DocumentState => new Map();

export const openDocument = (
  state: DocumentState,
  params: DidOpenTextDocumentParams,
): DocumentTransition<TextDocument> => {
  const item = params.textDocument;
  if (!Number.isInteger(item.version)) {
    return { accepted: false, state, reason: "invalid-version" };
  }
  if (state.has(item.uri)) {
    return { accepted: false, state, reason: "already-open" };
  }

  const document = TextDocument.create(
    item.uri,
    item.languageId,
    item.version,
    item.text,
  );
  const nextState = new Map(state);
  nextState.set(item.uri, document);

  return { accepted: true, state: nextState, value: document };
};

export const changeDocument = (
  state: DocumentState,
  params: DidChangeTextDocumentParams,
): DocumentTransition<DocumentChange> => {
  const previousDocument = state.get(params.textDocument.uri);
  const version = params.textDocument.version;
  if (!previousDocument) {
    return { accepted: false, state, reason: "not-open" };
  }
  if (!Number.isInteger(version)) {
    return { accepted: false, state, reason: "invalid-version" };
  }
  if (version <= previousDocument.version) {
    return { accepted: false, state, reason: "stale-version" };
  }
  if (params.contentChanges.length === 0) {
    return { accepted: false, state, reason: "empty-change" };
  }

  const contentChanges = params.contentChanges.map(cloneContentChange);
  const workingDocument = TextDocument.create(
    previousDocument.uri,
    previousDocument.languageId,
    previousDocument.version,
    previousDocument.getText(),
  );
  const document = TextDocument.update(
    workingDocument,
    contentChanges,
    version,
  );
  const nextState = new Map(state);
  nextState.set(document.uri, document);

  return {
    accepted: true,
    state: nextState,
    value: { previousDocument, document, contentChanges },
  };
};

export const closeDocument = (
  state: DocumentState,
  params: DidCloseTextDocumentParams,
): DocumentTransition<TextDocument> => {
  const document = state.get(params.textDocument.uri);
  if (!document) {
    return { accepted: false, state, reason: "not-open" };
  }

  const nextState = new Map(state);
  nextState.delete(document.uri);

  return { accepted: true, state: nextState, value: document };
};
