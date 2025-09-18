import { TextDocument } from "vscode-languageserver-textdocument";
import {
  DiagnosticRefreshRequest,
  DidChangeConfigurationNotification,
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
import { defaultSettings, type Settings } from "../handlers/compilation/compilation.ts";

const startLanguageServer = (
  connection: Connection,
  reader?: FileSystemReader
) => {
  let hasConfigurationCapability: boolean = false;

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    connection.console.info("Initializing Stan language server...");

    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );

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
    if (hasConfigurationCapability) {
      connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined
      );
    }
    connection.console.info("Stan language server is initialized!");
  });

  connection.onExit(() => {
    connection.console.info("Stan language server is exiting...");
  });


  let globalSettings: Settings = defaultSettings;

  // Cache the settings of all open documents
  let documentSettings: Map<string, Thenable<Settings>> = new Map();

  connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
      // Reset all cached document settings
      documentSettings.clear();
    } else {
      globalSettings = <Settings>(
        (change.settings["stan-language-server"] || defaultSettings)
      );
    }

    connection.sendRequest(DiagnosticRefreshRequest.type, undefined);
  });

  function getDocumentSettings(resource: string): Thenable<Settings> {
    if (!hasConfigurationCapability) {
      return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
      result = connection.workspace.getConfiguration({
        scopeUri: resource,
        section: "stan-language-server",
      });
      documentSettings.set(resource, result);
    }
    return result;
  }

  const documents = new TextDocuments(TextDocument);

  connection.onCompletion((params) => {
    return handleCompletion(params, documents);
  });

  connection.onRequest("textDocument/diagnostic", async (params) => {
    const folders = (await connection.workspace.getWorkspaceFolders()) || [];
    const settings = await getDocumentSettings(params.textDocument.uri);
    return {
      kind: "full",
      items: await handleDiagnostics(
        params,
        documents,
        folders,
        settings,
        connection.console
      ),
    };
  });

  connection.onDocumentFormatting(async (params) => {
    const folders = (await connection.workspace.getWorkspaceFolders()) || [];
    const settings = await getDocumentSettings(params.textDocument.uri);
    const formattingResult = await handleFormatting(
      params,
      documents,
      folders,
      settings,
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
