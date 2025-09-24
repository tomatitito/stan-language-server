import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocuments,
  WorkspaceFolder,
  type DocumentDiagnosticParams,
  type RemoteConsole,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideDiagnostics } from "../language/diagnostics";
import type {
  Range as DomainRange,
  DiagnosticSeverity as DomainSeverity,
  StanDiagnostic,
} from "../types/diagnostics";
import { handleCompilation, type Settings } from "./compilation/compilation";
import type { FileSystemReader } from "../types";
import { SERVER_ID } from "../constants";

function stanDiagnosticToLspDiagnostic(stanDiag: StanDiagnostic): Diagnostic {
  return {
    range: domainRangeToLspRange(stanDiag.range),
    severity: domainSeverityToLspSeverity(stanDiag.severity),
    message: stanDiag.message,
    source: stanDiag.source ?? SERVER_ID,
  };
}

function domainRangeToLspRange(domainRange: DomainRange): Range {
  return {
    start: {
      line: domainRange.start.line,
      character: domainRange.start.character,
    },
    end: {
      line: domainRange.end.line,
      character: domainRange.end.character,
    },
  };
}

function domainSeverityToLspSeverity(
  domainSeverity: DomainSeverity
): DiagnosticSeverity {
  switch (domainSeverity) {
    case 1:
      return DiagnosticSeverity.Error;
    case 2:
      return DiagnosticSeverity.Warning;
    case 3:
      return DiagnosticSeverity.Information;
    case 4:
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Error;
  }
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

  return stanDiagnostics.map(stanDiagnosticToLspDiagnostic);
}
