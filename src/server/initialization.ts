import type {
  InitializeParams,
  WorkspaceFolder,
} from "vscode-languageserver";

export const workspaceFoldersFromInitialize = (
  params: Pick<InitializeParams, "workspaceFolders" | "rootUri">,
): WorkspaceFolder[] => {
  if (params.workspaceFolders !== null && params.workspaceFolders !== undefined) {
    return [...params.workspaceFolders];
  }

  return params.rootUri
    ? [{ uri: params.rootUri, name: params.rootUri }]
    : [];
};
