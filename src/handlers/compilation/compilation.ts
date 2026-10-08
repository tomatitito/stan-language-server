import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { handleIncludes } from "./includes";
import type { FileSystemReader, TextDocumentProvider } from "../../types/common";
import { URI } from "vscode-uri";
import { check_model, type CheckResult, stanc, type StancReturn } from "stanc3";

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

export async function checkWithStanc(
  document: TextDocument,
  documentManager: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: FileSystemReader,
): Promise<CheckResult> {
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
  if (settings.warnPedantic) {
    // warn-pedantic is run late in the pipeline, so only functions if you don't request formatting
    stanc_args.push("warn-pedantic");
  }
  return Promise.resolve(check_model(filename, code, stanc_args, includes));
}

export async function formatWithStanc(
  document: TextDocument,
  documentManager: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
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

  const stanc_args = [
    `filename-in-msg=${filename}`,
    "allow-undefined",
    "auto-format",
    `max-line-length=${settings.maxLineLength}`,
    "canonicalze=deprecations"
  ];
  if (filename.endsWith(".stanfunctions")) {
    stanc_args.push("functions-only");
  }

  return Promise.resolve(stanc(filename, code, stanc_args, includes));
}
