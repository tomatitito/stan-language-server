import { TextDocument } from "vscode-languageserver-textdocument";
import {
    TextDocumentSyncKind,
    TextDocuments,
    type Connection,
    type InitializeParams,
    type InitializeResult,
} from "vscode-languageserver/node";
import { getFormattingErrors, handleCompletion, handleDiagnostics, handleFormatting, handleHover } from "./handlers";


const setUpLanguageServer = (connection: Connection) => {
  connection.onInitialize((_params: InitializeParams): InitializeResult => {
    connection.console.info("Initializing Stan language server...");

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          triggerCharacters: ["~"], // Trigger completion after tilde
          resolveProvider: false,
        },
        documentFormattingProvider: true,
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

  const documents = new TextDocuments(TextDocument);

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
      return await handleFormatting(params, documents, folders, connection.console);
    } catch (error) {
      // Log formatting errors for debugging
      const errors = await getFormattingErrors(params, documents, folders, connection.console);
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
};

export default setUpLanguageServer;
