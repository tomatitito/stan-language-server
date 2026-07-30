import { describe, expect, it } from "bun:test";
import type {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  changeDocument,
  closeDocument,
  emptyDocumentState,
  openDocument,
  type DocumentChange,
  type DocumentState,
  type DocumentTransition,
} from "../../server/document_state";

const uri = "file:///workspace/model.stan";

const openParams = (
  text = "abcdef",
  version = 1,
  documentUri = uri,
): DidOpenTextDocumentParams => ({
  textDocument: {
    uri: documentUri,
    languageId: "stan",
    version,
    text,
  },
});

const closeParams = (documentUri = uri): DidCloseTextDocumentParams => ({
  textDocument: { uri: documentUri },
});

const openedState = (text = "abcdef", version = 1): DocumentState => {
  const transition = openDocument(emptyDocumentState(), openParams(text, version));
  if (!transition.accepted) {
    throw new Error(`Expected open transition, got ${transition.reason}`);
  }
  return transition.state;
};

describe("document state", () => {
  it("opens and closes a document without mutating prior states", () => {
    const emptyState = emptyDocumentState();
    const document = TextDocument.create(uri, "stan", 1, "abcdef");
    const expectedOpened: DocumentTransition<TextDocument> = {
      accepted: true,
      state: new Map([[uri, document]]),
      value: document,
    };
    const expectedClosed: DocumentTransition<TextDocument> = {
      accepted: true,
      state: new Map(),
      value: document,
    };

    const opened = openDocument(emptyState, openParams());
    expect(opened.accepted).toBeTrue();
    expect(opened).toEqual(expectedOpened);
    expect(emptyState.size).toBe(0);
    expect(opened.state.get(uri)?.getText()).toBe("abcdef");

    const closed = closeDocument(opened.state, closeParams());
    expect(closed.accepted).toBeTrue();
    expect(closed).toEqual(expectedClosed);
    expect(opened.state.has(uri)).toBeTrue();
    expect(closed.state.has(uri)).toBeFalse();
  });

  it("applies multiple ranged changes in order", () => {
    const state = openedState();
    const contentChanges: DidChangeTextDocumentParams["contentChanges"] = [
      {
        range: {
          start: { line: 0, character: 1 },
          end: { line: 0, character: 3 },
        },
        text: "X",
      },
      {
        range: {
          start: { line: 0, character: 2 },
          end: { line: 0, character: 4 },
        },
        text: "Y",
      },
    ];
    const params: DidChangeTextDocumentParams = {
      textDocument: { uri, version: 2 },
      contentChanges,
    };
    const expectedPreviousDocument = TextDocument.create(
      uri,
      "stan",
      1,
      "abcdef",
    );
    const expectedValue: DocumentChange = {
      previousDocument: expectedPreviousDocument,
      document: TextDocument.update(
        TextDocument.create(
          expectedPreviousDocument.uri,
          expectedPreviousDocument.languageId,
          expectedPreviousDocument.version,
          expectedPreviousDocument.getText(),
        ),
        contentChanges,
        2,
      ),
      contentChanges,
    };

    const transition = changeDocument(state, params);
    expect(transition.accepted).toBeTrue();
    if (!transition.accepted) {
      throw new Error(`Expected change transition, got ${transition.reason}`);
    }

    expect(state.get(uri)?.getText()).toBe("abcdef");
    expect(transition.value).toEqual(expectedValue);
    expect(transition.state.get(uri)?.getText()).toBe("aXYf");
  });

  it("applies full-document replacements", () => {
    const transition = changeDocument(openedState(), {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: "parameters { real x; }" }],
    });

    expect(transition.accepted).toBeTrue();
    expect(transition.state.get(uri)?.getText()).toBe("parameters { real x; }");
    expect(transition.state.get(uri)?.version).toBe(2);
  });

  it("preserves raw changes independently of notification objects", () => {
    const params: DidChangeTextDocumentParams = {
      textDocument: { uri, version: 2 },
      contentChanges: [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        text: "A",
      }],
    };
    const transition = changeDocument(openedState(), params);
    if (!transition.accepted) {
      throw new Error(`Expected change transition, got ${transition.reason}`);
    }

    const inputChange = params.contentChanges[0];
    if (inputChange && "range" in inputChange) {
      inputChange.range.start.character = 5;
      inputChange.text = "changed later";
    }

    expect(transition.value.contentChanges).toEqual([{
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
      text: "A",
    }]);
  });

  it("rejects invalid transitions without replacing state", () => {
    const emptyState = emptyDocumentState();
    const unknownChange = changeDocument(emptyState, {
      textDocument: { uri, version: 1 },
      contentChanges: [{ text: "unknown" }],
    });
    expect(unknownChange).toEqual({
      accepted: false,
      state: emptyState,
      reason: "not-open",
    });
    expect(closeDocument(emptyState, closeParams())).toMatchObject({
      accepted: false,
      reason: "not-open",
    });
    expect(openDocument(emptyState, openParams("invalid", 1.5))).toMatchObject({
      accepted: false,
      reason: "invalid-version",
    });

    const state = openedState("original", 3);
    expect(openDocument(state, openParams("duplicate", 4))).toMatchObject({
      accepted: false,
      reason: "already-open",
    });
    expect(changeDocument(state, {
      textDocument: { uri, version: 3 },
      contentChanges: [{ text: "stale" }],
    })).toMatchObject({ accepted: false, reason: "stale-version" });
    expect(changeDocument(state, {
      textDocument: { uri, version: 4 },
      contentChanges: [],
    })).toMatchObject({ accepted: false, reason: "empty-change" });
    expect(changeDocument(state, {
      textDocument: { uri, version: undefined },
      contentChanges: [{ text: "missing version" }],
    } as unknown as DidChangeTextDocumentParams)).toMatchObject({
      accepted: false,
      reason: "invalid-version",
    });

    expect(state.get(uri)?.getText()).toBe("original");
    expect(state.get(uri)?.version).toBe(3);
  });

  it("keeps document transitions independent by URI", () => {
    const otherUri = "file:///workspace/other.stan";
    const firstDocument = TextDocument.create(uri, "stan", 1, "one");
    const secondDocument = TextDocument.create(otherUri, "stan", 7, "two");
    const contentChanges: DidChangeTextDocumentParams["contentChanges"] = [
      { text: "changed" },
    ];
    const changedDocument = TextDocument.update(
      TextDocument.create(
        firstDocument.uri,
        firstDocument.languageId,
        firstDocument.version,
        firstDocument.getText(),
      ),
      contentChanges,
      2,
    );
    const expectedChanged: DocumentTransition<DocumentChange> = {
      accepted: true,
      state: new Map([
        [uri, changedDocument],
        [otherUri, secondDocument],
      ]),
      value: {
        previousDocument: firstDocument,
        document: changedDocument,
        contentChanges,
      },
    };
    const expectedClosed: DocumentTransition<TextDocument> = {
      accepted: true,
      state: new Map([[uri, changedDocument]]),
      value: secondDocument,
    };

    const first = openDocument(emptyDocumentState(), openParams("one", 1));
    const second = openDocument(first.state, openParams("two", 7, otherUri));
    const changed = changeDocument(second.state, {
      textDocument: { uri, version: 2 },
      contentChanges,
    });
    const closed = closeDocument(changed.state, closeParams(otherUri));

    expect(changed).toEqual(expectedChanged);
    expect(closed).toEqual(expectedClosed);
    expect(closed.state.get(uri)?.getText()).toBe("changed");
    expect(closed.state.get(uri)?.version).toBe(2);
    expect(closed.state.has(otherUri)).toBeFalse();
    expect(changed.state.has(otherUri)).toBeTrue();
  });
});
