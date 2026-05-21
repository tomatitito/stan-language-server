import type {
  PrepareRenameParams,
  PrepareRenameResult,
  RenameParams,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { getSemanticIndexEntry } from "../language/ast/workspace_index";
import { prepareRename } from "../language/rename/prepare";
import { provideRename } from "../language/rename/provider";
import type { WorkspaceIndex } from "../language/ast/types";

export function handlePrepareRename(
  document: TextDocument,
  params: PrepareRenameParams,
  workspaceIndex: WorkspaceIndex,
): PrepareRenameResult | null {
  const entry = getSemanticIndexEntry(workspaceIndex, document);
  if (entry === null) {
    return null;
  }

  return prepareRename(entry, params.position)?.range ?? null;
}

export function handleRename(
  document: TextDocument,
  params: RenameParams,
  workspaceIndex: WorkspaceIndex,
): WorkspaceEdit {
  const entry = getSemanticIndexEntry(workspaceIndex, document);
  if (entry === null) {
    return { documentChanges: [] };
  }

  const occurrences = provideRename(entry, params.position);
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
