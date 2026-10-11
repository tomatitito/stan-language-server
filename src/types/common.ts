import type { TextDocument } from "vscode-languageserver-textdocument";
import type { WorkspaceFolder } from "vscode-languageserver";

export type FileUri = string;
export type FileLocation = "documentStore" | "disk";
export type FileVersion = number | string;

export type WorkspaceFile = {
  uri: FileUri;
  text: string;
  version: FileVersion;
  location: FileLocation;
};

export type DocumentStoreReader = {
  get(uri: FileUri): TextDocument | undefined;
};

export type WorkspaceFileReader = (
  uri: FileUri,
) => Promise<WorkspaceFile | null>;

export type TextDocumentProvider = {
  get(uri: string): TextDocument | undefined;
};

export type ContentProvider = {
  listWorkspaceFiles(
    workspaceFolders: readonly WorkspaceFolder[],
  ): Promise<readonly FileUri[]>;
  /**
   * Prefer open documents to persisted content, including documents opened
   * while an asynchronous read is pending. Return null for unavailable files.
   */
  readWorkspaceFile(
    uri: FileUri,
    documents: DocumentStoreReader,
  ): Promise<WorkspaceFile | null>;
};
