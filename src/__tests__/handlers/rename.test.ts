import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { RenameParams, WorkspaceEdit } from "vscode-languageserver-protocol";
import { handleRename } from "../../handlers/index";

describe("Rename Handler", () => {
  const document = TextDocument.create(
    "file:///test.stan",
    "stan",
    1,
    "parameters { real alpha; }",
  );
  const params: RenameParams = {
    textDocument: { uri: document.uri },
    position: { line: 0, character: 18 },
    newName: "beta",
  };

  let logSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    logSpy?.mockRestore();
  });

  it("returns an empty WorkspaceEdit and logs mock rename activity", async () => {
    logSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = await handleRename(document, params);

    const expected: WorkspaceEdit = { documentChanges: [] };
    expect(result).toEqual(expected);
    expect(logSpy).toHaveBeenCalledWith("hello rename", document.uri, params.newName);
  });
});
