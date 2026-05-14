import type {
  PrepareRenameParams,
  PrepareRenameResult,
  RenameParams,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { prepareRename } from "../language/rename/prepare";
import { provideRename } from "../language/rename/provider";

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

  const occurrences = provideRename(document.getText(), params.position);
  if (occurrences.length === 0) {
    return { documentChanges: [] };
  }

  return {
    documentChanges: [
      {
        textDocument: {
          uri: document.uri,
          version: document.version,
        },
        edits: occurrences.map((occurrence) => ({
          range: occurrence.range,
          newText: params.newName,
        })),
      },
    ],
  };
}
