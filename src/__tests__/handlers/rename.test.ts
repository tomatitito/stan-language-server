import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  PrepareRenameParams,
  Range,
  RenameParams,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import * as prepareModule from "../../language/rename/prepare";
import { handlePrepareRename, handleRename } from "../../handlers/index";

describe("Rename Handler", () => {
  const document = TextDocument.create(
    "file:///test.stan",
    "stan",
    1,
    "parameters { real alpha; }",
  );

  const prepareParams: PrepareRenameParams = {
    textDocument: { uri: document.uri },
    position: { line: 0, character: 19 },
  };

  const renameParams: RenameParams = {
    textDocument: { uri: document.uri },
    position: { line: 0, character: 18 },
    newName: "beta",
  };

  let prepareSpy: ReturnType<typeof spyOn>;
  let logSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    prepareSpy?.mockRestore();
    logSpy?.mockRestore();
  });

  it("delegates prepare rename to the language layer and returns the target range", async () => {
    prepareSpy = spyOn(prepareModule, "prepareRename").mockReturnValue({
      name: "alpha",
      range: {
        start: { line: 0, character: 18 },
        end: { line: 0, character: 23 },
      },
    });

    const result = await handlePrepareRename(document, prepareParams);

    const expected: Range = {
      start: { line: 0, character: 18 },
      end: { line: 0, character: 23 },
    };
    expect(result).toEqual(expected);
    expect(prepareSpy).toHaveBeenCalledWith(document.getText(), prepareParams.position);
  });

  it("returns an empty WorkspaceEdit and logs mock rename activity", async () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = await handleRename(document, renameParams);

    const expected: WorkspaceEdit = { documentChanges: [] };
    expect(result).toEqual(expected);
    expect(logSpy).toHaveBeenCalledWith("hello rename", document.uri, renameParams.newName);
  });
});
