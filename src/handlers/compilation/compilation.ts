import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type TextDocuments,
  type WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { handleIncludes } from "./includes";
import type { FileSystemReader } from "../../types/common";
import { URI } from "vscode-uri";
import { stanc, type StancReturn } from "stanc3";

export interface Settings {
  maxLineLength: number;
  includePaths: string[];
}
// todo?: warnPedantic: boolean;
//    would require the callers specify a purpose, since no pedantic warnings
//    are currently generated when the auto-format flag is used

export const defaultSettings: Settings = {
  maxLineLength: 78,
  includePaths: [],
};

export async function handleCompilation(
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: FileSystemReader
): Promise<StancReturn> {
  const filename = URI.parse(document.uri).fsPath;
  const code = document.getText();

  const includes = await handleIncludes(
    document,
    documentManager,
    workspaceFolders,
    settings.includePaths,
    logger,
    reader
  );
  const stanc_args = [
    "auto-format",
    `filename-in-msg=${filename}`,
    `max-line-length=${settings.maxLineLength}`,
    "canonicalze=deprecations",
    "allow-undefined",
  ];
  if (filename.endsWith(".stanfunctions")) {
    stanc_args.push("functions-only");
  }

  return Promise.resolve(stanc(filename, code, stanc_args, includes));
}
