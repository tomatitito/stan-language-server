import type {
  InitializeParams,
  WorkspaceFolder,
} from "vscode-languageserver/node";

export const workspaceFoldersFromInitialize = (
  params: Pick<InitializeParams, "workspaceFolders" | "rootUri">,
): WorkspaceFolder[] => {
  if (params.workspaceFolders?.length) {
    return [...params.workspaceFolders];
  }

  return params.rootUri
    ? [{ uri: params.rootUri, name: params.rootUri }]
    : [];
};
