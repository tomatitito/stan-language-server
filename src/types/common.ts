import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  FileUri,
  WorkspaceFile,
} from "../server/content_provider.ts";

export type WorkspaceFileReader = (
  uri: FileUri,
) => Promise<WorkspaceFile | null>;

export type TextDocumentProvider = {
  get(uri: string): TextDocument | undefined;
};
