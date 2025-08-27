// Diagnostic handler - manages LSP protocol conversion for diagnostics
import {
  type DocumentDiagnosticParams,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

// Import pure provider
import { provideDiagnostics } from "../language/diagnostics";

// Import domain types
import type { 
  StanDiagnostic,
  Range as DomainRange,
  Position as DomainPosition,
  DiagnosticSeverity as DomainSeverity
} from "../types/diagnostics";

// Import compiler and includes
import { compile } from "../stanc/compiler";
import { getIncludes } from "../stanc/includes";
import { URI, Utils as URIUtils } from "vscode-uri";
import { promises as fs } from "fs";

// Convert domain diagnostic to LSP diagnostic
function stanDiagnosticToLspDiagnostic(stanDiag: StanDiagnostic): Diagnostic {
  return {
    range: domainRangeToLspRange(stanDiag.range),
    severity: domainSeverityToLspSeverity(stanDiag.severity),
    message: stanDiag.message,
    source: stanDiag.source ?? "stan-language-server",
  };
}

// Convert domain range to LSP range
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

// Convert domain severity to LSP severity
function domainSeverityToLspSeverity(domainSeverity: DomainSeverity): DiagnosticSeverity {
  switch (domainSeverity) {
    case 1: return DiagnosticSeverity.Error;
    case 2: return DiagnosticSeverity.Warning;
    case 3: return DiagnosticSeverity.Information;
    case 4: return DiagnosticSeverity.Hint;
    default: return DiagnosticSeverity.Error;
  }
}

// Helper function to get includes for a file (copied from server.ts)
const getIncludeHelperForFile = (currentFilePath: URI, documents: TextDocuments<TextDocument>) => {
  return getIncludes(async (filename: string) => {
    const currentDir = URIUtils.dirname(currentFilePath);

    // first, try to look it up in files already known to the server
    // Note: We can't access connection.workspace here, so we'll skip workspace folder lookup
    // and just check if the document is already loaded
    const include_path = URIUtils.joinPath(currentDir, filename).toString();
    const include = documents.get(include_path);
    if (include) {
      return include.getText();
    }

    // fall back to reading from the filesystem
    if (currentDir.scheme === "file") {
      const includePath = URIUtils.joinPath(currentDir, filename);
      return await fs.readFile(includePath.fsPath, "utf-8");
    }

    throw new Error(`Include file not found: ${filename}`);
  });
};

export async function handleDiagnostics(
  params: DocumentDiagnosticParams,
  documents: TextDocuments<TextDocument>,
): Promise<Diagnostic[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  // Get include helper for this file
  const includes = getIncludeHelperForFile(URI.parse(document.uri), documents);
  
  // Compile the Stan code to get diagnostics
  const compilerResult = await compile(includes)(document);
  
  // Get diagnostics from pure provider
  const stanDiagnostics = provideDiagnostics(compilerResult);
  
  // Convert domain diagnostics to LSP format
  return stanDiagnostics.map(stanDiagnosticToLspDiagnostic);
}