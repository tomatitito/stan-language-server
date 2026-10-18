import type { DefinitionParams, Location } from "vscode-languageserver-protocol";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { WorkspaceIndex } from "../language/ast/types";
import { getSemanticIndexEntry } from "../language/ast/workspace_index";
import { provideDefinition } from "../language/definition/provider";

export function handleDefinition(
  document: TextDocument,
  params: DefinitionParams,
  workspaceIndex: WorkspaceIndex,
): Location | null {
  const entry = getSemanticIndexEntry(workspaceIndex, document);
  if (entry === null) {
    return null;
  }

  const range = provideDefinition(entry, params.position);
  return range === null ? null : { uri: document.uri, range };
}
