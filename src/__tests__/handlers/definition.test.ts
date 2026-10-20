import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { DefinitionParams } from "vscode-languageserver-protocol";
import { handleDefinition } from "../../handlers/definition";
import * as providerModule from "../../language/definition/provider";
import type { SemanticIndexEntry, WorkspaceIndex } from "../../language/ast/types";

describe("Definition handler", () => {
  let providerSpy: ReturnType<typeof spyOn<typeof providerModule, "provideDefinition">>;

  beforeEach(() => {
    providerSpy = spyOn(providerModule, "provideDefinition").mockReturnValue(null);
  });

  afterEach(() => {
    providerSpy.mockRestore();
  });

  it("returns the document URI and resolved range and delegates the exact position", () => {
    const document = TextDocument.create(
      "file:///definition.stan", "stan", 3,
      "parameters {\n  real foo;\n}\nmodel {\n  target += foo;\n}",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: 3,
      text: document.getText(),
      get tree(): never {
        throw new Error("The handler must not inspect the borrowed tree");
      },
      get semanticIndex(): never {
        throw new Error("The handler must not inspect the borrowed semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params: DefinitionParams = {
      textDocument: { uri: document.uri },
      position: { line: 4, character: 13 },
    };
    providerSpy.mockReturnValue({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });

    const result = handleDefinition(document, params, index);

    expect(result).toEqual({
      uri: "file:///definition.stan",
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      },
    });
    expect(providerSpy).toHaveBeenCalledTimes(1);
    expect(providerSpy.mock.calls[0]?.[0]).toBe(entry);
    expect(providerSpy.mock.calls[0]?.[1]).toEqual({ line: 4, character: 13 });
  });

  it("returns null when the provider cannot resolve a definition", () => {
    const document = TextDocument.create(
      "file:///builtin.stan", "stan", 1, "model { target += square(2.0); }",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: 1,
      text: document.getText(),
      get tree(): never {
        throw new Error("The handler must not inspect the borrowed tree");
      },
      get semanticIndex(): never {
        throw new Error("The handler must not inspect the borrowed semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params: DefinitionParams = {
      textDocument: { uri: document.uri },
      position: { line: 0, character: 19 },
    };
    providerSpy.mockReturnValue(null);

    const result = handleDefinition(document, params, index);

    expect(result).toBeNull();
    expect(providerSpy).toHaveBeenCalledTimes(1);
    expect(providerSpy.mock.calls[0]?.[0]).toBe(entry);
    expect(providerSpy.mock.calls[0]?.[1]).toEqual({ line: 0, character: 19 });
  });

  it("returns null without calling the provider when the index entry is missing", () => {
    const document = TextDocument.create(
      "file:///missing.stan", "stan", 1, "parameters { real foo; }",
    );
    const index: WorkspaceIndex = { entries: new Map() };
    const params: DefinitionParams = {
      textDocument: { uri: document.uri },
      position: { line: 0, character: 19 },
    };

    const result = handleDefinition(document, params, index);

    expect(result).toBeNull();
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("returns null without calling the provider when the index entry is stale", () => {
    const document = TextDocument.create(
      "file:///versioned.stan", "stan", 3, "parameters { real foo; }",
    );
    const entry: SemanticIndexEntry = {
      uri: document.uri,
      version: 2,
      text: document.getText(),
      get tree(): never {
        throw new Error("The handler must not inspect the borrowed tree");
      },
      get semanticIndex(): never {
        throw new Error("The handler must not inspect the borrowed semantic index");
      },
    };
    const index: WorkspaceIndex = { entries: new Map([[document.uri, entry]]) };
    const params: DefinitionParams = {
      textDocument: { uri: document.uri },
      position: { line: 0, character: 19 },
    };

    const result = handleDefinition(document, params, index);

    expect(result).toBeNull();
    expect(providerSpy).not.toHaveBeenCalled();
  });
});
