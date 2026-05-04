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
  warnPedantic: boolean;
}

export const defaultSettings: Settings = {
  maxLineLength: 78,
  includePaths: [],
  warnPedantic: false,
};

export type Purpose = "formatting" | "linting";

export async function handleCompilation(
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  purpose: Purpose,
  logger: RemoteConsole,
  reader?: FileSystemReader,
): Promise<StancReturn> {
  const filename = URI.parse(document.uri).fsPath;
  const code = document.getText();

  const includes = await handleIncludes(
    document,
    documentManager,
    workspaceFolders,
    settings.includePaths,
    logger,
    reader,
  );

  const stanc_args = [`filename-in-msg=${filename}`, "allow-undefined"];
  if (filename.endsWith(".stanfunctions")) {
    stanc_args.push("functions-only");
  }

  if (purpose === "formatting") {
    stanc_args.push(
      "auto-format",
      `max-line-length=${settings.maxLineLength}`,
      "canonicalze=deprecations",
    );
  } else if (settings.warnPedantic) {
    // warn-pedantic is run late in the pipeline, so only functions if you don't request formatting
    stanc_args.push("warn-pedantic");
  }

  return Promise.resolve(stanc(filename, code, stanc_args, includes));
}
