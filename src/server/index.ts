import { TextDocument } from "vscode-languageserver-textdocument";
import {
  DiagnosticRefreshRequest,
  DidChangeConfigurationNotification,
  DocumentDiagnosticRequest,
  MessageType,
  TextDocumentSyncKind,
  CompletionItemKind,
  type Connection,
  type InitializeParams,
  type InitializeResult,
} from "vscode-languageserver/node";
import {
  handleCompletion,
  handleDiagnostics,
  handleFormatting,
  handleHover,
  handlePrepareRename,
  handleRename,
} from "../handlers/index.ts";
import { type FileSystemReader } from "../types/common.ts";
import {
  defaultSettings,
  type Settings,
} from "../handlers/compilation/compilation.ts";
import { SERVER_ID } from "../constants/index.ts";
import {
  changeWorkspaceDocument,
  closeWorkspaceDocument,
  createServerWorkspaceState,
  forceWorkspaceIndexUpdate,
  openWorkspaceDocument,
  type WorkspaceIndexUpdateOptions,
} from "./workspace_state.ts";

const startLanguageServer = (
  connection: Connection,
  reader?: FileSystemReader,
) => {
  let hasConfigurationCapability: boolean = false;
  let hasWorkspaceFolderCapability: boolean = false;
  let hasDynamicConfigurationRequestCapability: boolean = false;
  let hasSnippetSupport: boolean = false;

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    connection.console.info("Initializing Stan language server...");

    const capabilities = params.capabilities;

    hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);
    hasDynamicConfigurationRequestCapability = Boolean(
      capabilities.workspace?.configuration &&
      capabilities.workspace?.didChangeConfiguration?.dynamicRegistration,
    );
    hasWorkspaceFolderCapability = Boolean(
      capabilities.workspace?.workspaceFolders,
    );
    hasSnippetSupport = Boolean(
      capabilities.textDocument?.completion?.completionItem?.snippetSupport ||
      capabilities.textDocument?.completion?.completionItemKind?.valueSet?.some(
        (kind) => kind === CompletionItemKind.Snippet,
      ),
    );

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          triggerCharacters: ["~"], // Trigger completion after tilde
          resolveProvider: false,
        },
        documentFormattingProvider: true,
        documentRangeFormattingProvider: false,
        workspace: {
          workspaceFolders: {
            supported: hasWorkspaceFolderCapability,
          },
        },
        hoverProvider: true,
        renameProvider: {
          prepareProvider: true,
        },
        diagnosticProvider: {
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        // Add more capabilities as needed
      },
    };
  });

  connection.onInitialized(async () => {
    if (hasDynamicConfigurationRequestCapability) {
      await connection.client.register(DidChangeConfigurationNotification.type);
      connection.console.info("Registered for didChangeConfiguration");
    }
    connection.console.info("Stan language server is initialized");
  });

  connection.onExit(() => {
    connection.console.info("Stan language server is exiting...");
  });

  let globalSettings: Settings = defaultSettings;

  // Cache the settings of all open documents
  const documentSettings: Map<string, Settings> = new Map();

  connection.onDidChangeConfiguration((change) => {
    if (hasDynamicConfigurationRequestCapability) {
      // Reset all cached document settings
      documentSettings.clear();
    } else {
      const incomingSettings = change.settings[SERVER_ID] || {};
      globalSettings = { ...globalSettings, ...incomingSettings };
    }

    connection.sendRequest(DiagnosticRefreshRequest.type);
  });

  const getDocumentSettings = async (resource: string) => {
    if (!hasConfigurationCapability) {
      return Promise.resolve(globalSettings);
    }
    // check cache
    const result = documentSettings.get(resource);
    if (result !== undefined) {
      return result;
    }

    // request from client
    const clientSettings =
      (await connection.workspace.getConfiguration({
        scopeUri: resource,
        section: SERVER_ID,
      })) || {};
    const docSettings: Settings = { ...defaultSettings, ...clientSettings };
    documentSettings.set(resource, docSettings);
    return docSettings;
  };

  const workspace = createServerWorkspaceState();
  const workspaceIndexUpdateOptions: WorkspaceIndexUpdateOptions = {
    debounceMs: 75,
    reportError: (uri, error) => {
      connection.console.error(
        `Failed to update workspace index for ${uri}: ${String(error)}`,
      );
    },
  };

  const isStanDocument = (document: TextDocument) => {
    return document.languageId.startsWith("stan");
  };

  connection.onCompletion((params) => {
    return handleCompletion(params, workspace.documents, hasSnippetSupport);
  });

  const getWorkspaceFolders = async () => {
    if (hasWorkspaceFolderCapability) {
      return (await connection.workspace.getWorkspaceFolders()) || [];
    }
    return [];
  };

  connection.onRequest(DocumentDiagnosticRequest.method, async (params) => {
    const folders = await getWorkspaceFolders();
    const settings = await getDocumentSettings(params.textDocument.uri);
    return {
      kind: "full",
      items: await handleDiagnostics(
        params,
        workspace.documents,
        folders,
        settings,
        connection.console,
        reader,
      ),
    };
  });

  connection.onDocumentFormatting(async (params) => {
    const folders = await getWorkspaceFolders();
    const settings = await getDocumentSettings(params.textDocument.uri);
    const formattingResult = await handleFormatting(
      params,
      workspace.documents,
      folders,
      settings,
      connection.console,
      reader,
    );
    if (Array.isArray(formattingResult)) {
      return formattingResult;
    } else {
      connection.console.error("Formatting errors:");
      for (const error of formattingResult.errors) {
        connection.console.error(error);
      }
      connection.sendNotification("window/showMessage", {
        type: MessageType.Error,
        message:
          "Formatting failed due to compile errors. See diagnostics for details.",
      });
      return [];
    }
  });

  connection.onHover((params) => {
    const document = workspace.documents.get(params.textDocument.uri);
    if (!document || !isStanDocument(document)) {
      return null;
    }
    return handleHover(document, params);
  });

  connection.onPrepareRename(async (params) => {
    const document = workspace.documents.get(params.textDocument.uri);
    if (!document || !isStanDocument(document)) {
      return null;
    }
    await forceWorkspaceIndexUpdate(
      workspace,
      document,
      workspaceIndexUpdateOptions,
    );
    return handlePrepareRename(
      document,
      params,
      workspace.indexing.index,
    );
  });

  connection.onRenameRequest(async (params) => {
    const document = workspace.documents.get(params.textDocument.uri);
    if (!document || !isStanDocument(document)) {
      return { documentChanges: [] };
    }
    await forceWorkspaceIndexUpdate(
      workspace,
      document,
      workspaceIndexUpdateOptions,
    );
    return handleRename(document, params, workspace.indexing.index);
  });

  connection.onDidOpenTextDocument((params) => {
    openWorkspaceDocument(workspace, params, workspaceIndexUpdateOptions);
  });

  connection.onDidChangeTextDocument((params) => {
    changeWorkspaceDocument(workspace, params, workspaceIndexUpdateOptions);
  });

  connection.onDidCloseTextDocument((params) => {
    closeWorkspaceDocument(workspace, params);
  });

  connection.listen();
};

export default startLanguageServer;
