import {
  Diagnostic,
  DiagnosticSeverity,
  TextDocuments,
  WorkspaceFolder,
  type DocumentDiagnosticParams,
  type RemoteConsole,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleCompilation, type Settings } from "./compilation/compilation";
import type { FileSystemReader } from "../types";
import { SERVER_ID } from "../constants";
import type { StancReturn } from "stanc3";
import {
  getErrorMessage,
  getWarningMessage,
  rangeFromMessage,
} from "../language/diagnostics/linter";

export function provideDiagnostics(compilerResult: StancReturn): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (compilerResult.errors) {
    for (const error of compilerResult.errors) {
      const range = rangeFromMessage(error);
      if (range) {
        diagnostics.push({
          range,
          severity: DiagnosticSeverity.Error,
          message: getErrorMessage(error),
          source: SERVER_ID,
        });
      }
    }
  }
  if (compilerResult.warnings) {
    for (const warning of compilerResult.warnings) {
      const range = rangeFromMessage(warning);
      if (range) {
        diagnostics.push({
          range,
          severity: DiagnosticSeverity.Warning,
          message: getWarningMessage(warning),
          source: SERVER_ID,
        });
      }
    }
  }
  return diagnostics;
}

export async function handleDiagnostics(
  params: DocumentDiagnosticParams,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: FileSystemReader
): Promise<Diagnostic[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const compilerResult = await handleCompilation(
    document,
    documents,
    workspaceFolders,
    settings,
    logger,
    reader
  );
  const stanDiagnostics = provideDiagnostics(compilerResult);

  return stanDiagnostics;
}
