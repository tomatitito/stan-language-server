import {
    Diagnostic,
    DiagnosticSeverity, TextDocuments,
    WorkspaceFolder,
    type DocumentDiagnosticParams,
    type RemoteConsole
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SERVER_ID } from "../constants";
import {
    provideDiagnostics
} from "../language/diagnostics/provider";
import type { FileSystemReader } from "../types";
import { handleCompilation, type Settings } from "./compilation/compilation";

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

  const diagnostics: Diagnostic[] = provideDiagnostics(compilerResult).map((diagnostic) => {
    if (diagnostic.severity === "error") {
      return {
        range: diagnostic.range,
        severity: DiagnosticSeverity.Error,
        message: diagnostic.message,
        source: SERVER_ID
      }
    }
    else if (diagnostic.severity === "warning") {
      return {
        range: diagnostic.range,
        severity: DiagnosticSeverity.Warning,
        message: diagnostic.message,
        source: SERVER_ID
      }
    }
  }).filter((diagnostic) => diagnostic !== undefined);

  return diagnostics;
}
