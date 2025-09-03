import {
  createConnection,
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleCompletion, handleDiagnostics, handleHover } from "./handlers";

import { handleCompilation } from "./handlers/compilation/compilation";

const connection = createConnection(process.stdin, process.stdout);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info("Initializing Stan language server...");

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
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
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
  return handleCompletion(params, documents);
});

connection.onRequest("textDocument/diagnostic", async (params) => {
  return {
    kind: "full",
    items: await handleDiagnostics(params, documents),
  };
});

connection.onDocumentFormatting(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    const folders = (await connection.workspace.getWorkspaceFolders()) || [];
    const result = await handleCompilation(document, documents, folders);

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
  return handleHover(document, params);
});

documents.listen(connection);

connection.listen();
