import { describe, expect, it } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createWorkspaceIndex, getSemanticIndexEntry, upsertSemanticIndexEntry } from "../../../language/ast/workspace_index";
import { prepareRename } from "../../../language/rename/prepare";

const createIndexedEntry = async (text: string) => {
  const document = TextDocument.create("file:///prepare-rename-test.stan", "stan", 1, text);
  const index = await upsertSemanticIndexEntry(createWorkspaceIndex(), document);
  const entry = getSemanticIndexEntry(index, document);
  if (entry === null) {
    throw new Error("Expected indexed entry");
  }
  return entry;
};

describe("prepareRename", () => {
  it("returns the symbol occurrence at the requested position", async () => {
    const entry = await createIndexedEntry(`parameters {\n  real alpha;\n}\nmodel {\n  alpha ~ normal(0, 1);\n}\n`);

    const result = prepareRename(entry, {
      line: 4,
      character: 3,
    });

    expect(result).toEqual({
      name: "alpha",
      range: {
        start: { line: 4, character: 2 },
        end: { line: 4, character: 7 },
      },
    });
  });

  it("returns null when the requested position is not on a symbol", async () => {
    const entry = await createIndexedEntry(`parameters {\n  real alpha;\n}\n`);

    const result = prepareRename(entry, {
      line: 1,
      character: 12,
    });

    expect(result).toBeNull();
  });

  it("returns null for unresolved or non-renameable names", async () => {
    const entry = await createIndexedEntry(`model {\n  print(alpha);\n}\n`);

    const result = prepareRename(entry, {
      line: 1,
      character: 3,
    });

    expect(result).toBeNull();
  });
});
