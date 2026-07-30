import type { TextDocument } from "vscode-languageserver-textdocument";
import type { FileContent, Filename } from "../handlers/compilation/includes";

export type FileSystemReader = (filename: Filename) => Promise<FileContent>;

export type TextDocumentProvider = {
  get(uri: string): TextDocument | undefined;
};
