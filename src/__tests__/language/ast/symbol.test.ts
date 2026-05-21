import { describe, expect, it } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { symbolAtPosition } from "../../../language/ast/symbol";
import {
  createWorkspaceIndex,
  getSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../../../language/ast/workspace_index";

const createIndexedEntry = async (text: string) => {
  const document = TextDocument.create("file:///symbol-test.stan", "stan", 1, text);
  const index = await upsertSemanticIndexEntry(createWorkspaceIndex(), document);
  const entry = getSemanticIndexEntry(index, document);
  if (entry === null) {
    throw new Error("Expected indexed entry");
  }
  return entry;
};

const getSymbolIdByName = (
  entry: Awaited<ReturnType<typeof createIndexedEntry>>,
  name: string,
) => {
  for (const [symbolId, symbol] of entry.semanticIndex.symbolsById.entries()) {
    if (symbol.name === name) {
      return symbolId;
    }
  }
  return undefined;
};

describe("symbolAtPosition", () => {
  const stanProgram = `
parameters {
  real alpha;
}
model {
  alpha ~ normal(0, 1);
}
`.trimStart();

  it("returns undefined when not on a symbol", async () => {
    const entry = await createIndexedEntry(stanProgram);

    expect(
      symbolAtPosition(entry, entry.text, { line: 1, character: 5 }),
    ).toBeUndefined();
    expect(
      symbolAtPosition(entry, entry.text, { line: 1, character: 6 }),
    ).toBeUndefined();
    expect(
      symbolAtPosition(entry, entry.text, { line: 4, character: 8 }),
    ).toBeUndefined();
  });

  it("returns the correct symbol for a declaration", async () => {
    const entry = await createIndexedEntry(stanProgram);
    const alphaSymbolId = getSymbolIdByName(entry, "alpha")!;

    expect(
      symbolAtPosition(entry, entry.text, { line: 1, character: 7 })?.symbolId,
    ).toEqual(alphaSymbolId);
    expect(
      symbolAtPosition(entry, entry.text, { line: 1, character: 8 })?.symbolId,
    ).toEqual(alphaSymbolId);
    expect(
      symbolAtPosition(entry, entry.text, { line: 1, character: 9 })?.symbolId,
    ).toEqual(alphaSymbolId);
  });

  it("returns the correct symbol for a reference", async () => {
    const entry = await createIndexedEntry(stanProgram);
    const alphaSymbolId = getSymbolIdByName(entry, "alpha")!;

    expect(
      symbolAtPosition(entry, entry.text, { line: 4, character: 2 })?.symbolId,
    ).toEqual(alphaSymbolId);
    expect(
      symbolAtPosition(entry, entry.text, { line: 4, character: 3 })?.symbolId,
    ).toEqual(alphaSymbolId);
  });
});
