import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type TextDocuments,
  type WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { handleIncludes } from "./includes";
import { stanc } from "../../stanc/compiler";
import type { StancReturn } from "../../types/common";
import { URI } from "vscode-uri";

export async function handleCompilation(
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  logger: RemoteConsole
): Promise<StancReturn> {
  const lineLength = 78; // TODO make this configurable

  const filename = URI.parse(document.uri).fsPath;
  const code = document.getText();

  const includes = await handleIncludes(
    document,
    documentManager,
    workspaceFolders,
    logger
  );
  const stanc_args = [
    "auto-format",
    `filename-in-msg=${filename}`,
    `max-line-length=${lineLength}`,
    "canonicalze=deprecations",
    "allow-undefined",
  ];
  if (filename.endsWith(".stanfunctions")) {
    stanc_args.push("functions-only");
  }

  return Promise.resolve(stanc(filename, code, stanc_args, includes));
}
