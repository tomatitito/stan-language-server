import { TextDocument } from "vscode-languageserver-textdocument";
import {
  TextDocumentSyncKind,
  TextDocuments,
  type Connection,
  type InitializeParams,
  type InitializeResult,
} from "vscode-languageserver/node";
import {
  handleCompletion,
  handleDiagnostics,
  handleFormatting,
  handleHover,
} from "../handlers/index.ts";
import {
  setFileSystemReader,
  type FileSystemReader,
} from "../handlers/compilation/includes.ts";

const startLanguageServer = (
  connection: Connection,
  reader?: FileSystemReader
) => {
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
          interFileDependencies: true,
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
      items: await handleDiagnostics(
        params,
        documents,
        folders,
        connection.console
      ),
    };
  });

  connection.onDocumentFormatting(async (params) => {
    const folders = (await connection.workspace.getWorkspaceFolders()) || [];

    const formattingResult = await handleFormatting(
      params,
      documents,
      folders,
      connection.console
    );
    if (Array.isArray(formattingResult)) {
      return formattingResult;
    } else {
      connection.console.error("Formatting errors:");
      for (const error of formattingResult.errors) {
        connection.console.error(error);
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

  if (reader) {
    setFileSystemReader(reader);
  }

  documents.listen(connection);

  connection.listen();
};

export default startLanguageServer;
