import {
  createConnection,
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleCompletion, handleDiagnostics, handleHover, handleFormatting, getFormattingErrors } from "./handlers";

const connection = createConnection(process.stdin, process.stdout);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams): InitializeResult => {
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
  const folders = (await connection.workspace.getWorkspaceFolders()) || [];
  return {
    kind: "full",
    items: await handleDiagnostics(params, documents, folders),
  };
});

connection.onDocumentFormatting(async (params) => {
  const folders = (await connection.workspace.getWorkspaceFolders()) || [];
  
  try {
    return await handleFormatting(params, documents, folders);
  } catch (error) {
    // Log formatting errors for debugging
    const errors = await getFormattingErrors(params, documents, folders);
    if (errors.length > 0) {
      connection.console.error("Formatting error:");
      for (const error of errors) {
        connection.console.error(error);
      }
    }
    return [];
  }
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
