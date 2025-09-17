import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type TextDocuments,
  type WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { handleIncludes } from "./includes";
import type { StancFunction, StancReturn } from "../../types/common";
import { URI } from "vscode-uri";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stancjs = require("../../stanc/stanc.js");
const stanc: StancFunction = stancjs.stanc;

export async function handleCompilation(
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  logger: RemoteConsole
): Promise<StancReturn> {
  const lineLength = 78; // make this configurable

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
