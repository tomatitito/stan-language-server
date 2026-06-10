import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  PrepareRenameParams,
  Range,
  RenameParams,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import * as providerModule from "../../language/rename/provider";
import {
  createWorkspaceIndex,
  upsertSemanticIndexEntry,
} from "../../language/ast/workspace_index";
import { handlePrepareRename, handleRename } from "../../handlers/index";

const createIndexedWorkspace = async (document: TextDocument) => {
  return upsertSemanticIndexEntry(createWorkspaceIndex(), document);
};

describe("Rename Handler", () => {
  const document = TextDocument.create(
    "file:///test.stan",
    "stan",
    1,
    "parameters { real alpha; }\nmodel { alpha ~ normal(0, 1); }",
  );

  const prepareParams: PrepareRenameParams = {
    textDocument: { uri: document.uri },
    position: { line: 1, character: 8 },
  };

  const renameParams: RenameParams = {
    textDocument: { uri: document.uri },
    position: { line: 0, character: 19 },
    newName: "beta",
  };

  let occurrencesSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    occurrencesSpy?.mockRestore();
  });

  it("returns the range for the symbol at the cursor", async () => {
    const workspaceIndex = await createIndexedWorkspace(document);

    const result = handlePrepareRename(document, prepareParams, workspaceIndex);

    const expected: Range = {
      start: { line: 1, character: 8 },
      end: { line: 1, character: 13 },
    };
    expect(result).toEqual(expected);
  });

  it("delegates rename occurrence lookup to the language layer and converts it to a WorkspaceEdit", async () => {
    occurrencesSpy = spyOn(providerModule, "provideRename").mockReturnValue([
      {
        range: {
          start: { line: 0, character: 18 },
          end: { line: 0, character: 23 },
        },
      },
    ]);

    const workspaceIndex = await createIndexedWorkspace(document);
    const result = handleRename(document, renameParams, workspaceIndex);

    const expected: WorkspaceEdit = {
      documentChanges: [
        {
          textDocument: {
            uri: document.uri,
            version: document.version,
          },
          edits: [
            {
              range: {
                start: { line: 0, character: 18 },
                end: { line: 0, character: 23 },
              },
              newText: "beta",
            },
          ],
        },
      ],
    };
    expect(result).toEqual(expected);
    expect(occurrencesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: document.getText() }),
      renameParams.position,
    );
  });
});
