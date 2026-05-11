import type { RenameParams, WorkspaceEdit } from "vscode-languageserver-protocol";
import type { TextDocument } from "vscode-languageserver-textdocument";

export async function handleRename(
  document: TextDocument,
  params: RenameParams,
): Promise<WorkspaceEdit> {
  console.error("hello rename", document.uri, params.newName);
  return { documentChanges: [] };
}
