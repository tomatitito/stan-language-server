import {
  createConnection,
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import provideDistributionCompletions from "./language/completion/providers/distributions";
import provideFunctionCompletions from "./language/completion/providers/functions";
import provideKeywordCompletions from "./language/completion/providers/keywords";
import provideDatatypeCompletions from "./language/completion/providers/datatypes";
import {
  setupSignatureMap,
  tryFunctionHover,
} from "./language/hover/functions";
import {
  setupDistributionMap,
  tryDistributionHover,
} from "./language/hover/distributions";
import { compile } from "./stanc/compiler";
import { getIncludes } from "./stanc/includes";
import { URI, Utils as URIUtils } from "vscode-uri";
import { promises as fs } from "fs";
import {
  getErrorMessage,
  getWarningMessage,
  rangeFromMessage,
} from "./language/linter";

const connection = createConnection(process.stdin, process.stdout);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info("Initializing Stan language server...");

  setupSignatureMap();
  setupDistributionMap();
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ["~"], // Trigger completion after tilde
        resolveProvider: false, // Set to true if you implement resolve
      },
      documentFormattingProvider: true, // Enable document formatting
      workspace: {
        workspaceFolders: {
          supported: true,
        },
      },
      hoverProvider: true,
      // Add more capabilities as needed
    },
  };
});

connection.onInitialized(() => {
  connection.console.info("Stan language server is initialized!");
});

connection.onExit(() => {
  connection.console.info("Stan language server is exiting...");
});

connection.onCompletion((params) => {
  const distributions = provideDistributionCompletions(params, documents);
  const functions = provideFunctionCompletions(params, documents);
  const keywords = provideKeywordCompletions(params, documents);
  const datatypes = provideDatatypeCompletions(params, documents);
  const candidates = [
    ...distributions,
    ...functions,
    ...keywords,
    ...datatypes,
  ];
  return candidates;
});

const getIncludeHelperForFile = (currentFilePath: URI) => {
  return getIncludes(async (filename: string) => {
    const currentDir = URIUtils.dirname(currentFilePath);

    // first, try to look it up in files already known to the server
    let folders = (await connection.workspace.getWorkspaceFolders()) || [];
    // insert path.dirname of current file
    folders = [
      { uri: currentDir.toString(), name: "current directory" },
      ...folders,
    ];
    for (const folder of folders) {
      const include_path = folder.uri + "/" + filename;
      const include = documents.get(include_path);
      if (include) {
        return include.getText();
      }
    }

    // fall back to reading from the filesystem
    if (currentDir.scheme === "file") {
      const includePath = URIUtils.joinPath(currentDir, filename);
      return await fs.readFile(includePath.fsPath, "utf-8");
    }

    connection.console.error(`Include file not found: ${filename}`);
    throw new Error(`Include file not found: ${filename}`);
  });
};

connection.onDocumentFormatting(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    const getIncludesFn = getIncludeHelperForFile(URI.parse(document.uri));
    const result = await compile(getIncludesFn)(document);

    if (result.result) {
      // Stan compiler only formats entire documents
      const range = {
        start: { line: 0, character: 0 },
        end: {
          line: document.lineCount - 1,
          character: document.getText().length,
        },
      };
      return [
        {
          range,
          newText: result.result,
        },
      ];
    } else if (result.errors) {
      connection.console.error("Formatting error:");
      for (const line of result.errors[1]?.split("\n") || []) {
        connection.console.error(line);
      }
    }
  }
  return [];
});

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return null;
  }

  const text = document.getText();

  let offset = document.offsetAt(params.position); // include the character at the cursor position

  const next_paren = text.substring(offset).match(/^\w+\s*\(/);
  if (next_paren) {
    const endOfWord = offset + next_paren[0].length - 1;

    const distributionHover = tryDistributionHover(document, endOfWord);
    if (distributionHover) return distributionHover;

    const functionHover = tryFunctionHover(document, endOfWord);
    if (functionHover) return functionHover;
  }

  return null;
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const includes = getIncludeHelperForFile(URI.parse(textDocument.uri));
  const result = await compile(includes)(textDocument);

  let diagnostics: Diagnostic[] = [];

  if (result.errors) {
    for (const error of result.errors) {
      const range = rangeFromMessage(error.toString());
      if (range === undefined) continue;
      const message = getErrorMessage(error);
      let diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range,
        message,
        source: "stan-language-server",
      };

      diagnostics.push(diagnostic);
    }
  }
  if (result.warnings) {
    for (const warning of result.warnings) {
      const range = rangeFromMessage(warning.toString());
      if (range === undefined) continue;
      const message = getWarningMessage(warning);
      let diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Warning,
        range,
        message,
        source: "stan-language-server",
      };
      diagnostics.push(diagnostic);
    }
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

connection.onDidChangeConfiguration((change) => {
  documents.all().forEach(validateTextDocument);
});

documents.listen(connection);

connection.listen();
