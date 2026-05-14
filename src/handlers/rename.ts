import type {
  PrepareRenameParams,
  PrepareRenameResult,
  RenameParams,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { prepareRename } from "../language/rename/prepare";

export async function handlePrepareRename(
  document: TextDocument,
  params: PrepareRenameParams,
): Promise<PrepareRenameResult | null> {
  const target = prepareRename(document.getText(), params.position);
  return target?.range ?? null;
}

export async function handleRename(
  document: TextDocument,
  params: RenameParams,
): Promise<WorkspaceEdit> {
  console.error("hello rename", document.uri, params.newName);
  return { documentChanges: [] };
}
