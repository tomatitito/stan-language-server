import {
  createConnection,
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(process.stdin, process.stdout);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info("Initializing Stan language server...");
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
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

documents.onDidChangeContent((change) => {
  connection.sendNotification("window/showMessage", {
    type: 3, // Info
    message: `Document ${change.document.uri} has changed.`,
  });
});

documents.listen(connection);

connection.listen();
