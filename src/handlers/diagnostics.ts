import {
    Diagnostic,
    DiagnosticSeverity,
    WorkspaceFolder,
    type DocumentDiagnosticParams,
    type RemoteConsole
} from "vscode-languageserver";
import { SERVER_ID } from "../constants";
import {
    provideDiagnostics
} from "../language/diagnostics/provider";
import type { TextDocumentProvider, WorkspaceFileReader } from "../types";
import { handleCompilation, type Settings } from "./compilation/compilation";

export async function handleDiagnostics(
  params: DocumentDiagnosticParams,
  documents: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: WorkspaceFileReader
): Promise<Diagnostic[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document || !document.languageId.startsWith("stan")) {
    return [];
  }

  const compilerResult = await handleCompilation(
    document,
    documents,
    workspaceFolders,
    settings,
    "linting",
    logger,
    reader,
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
