import {
  createConnection,
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
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

documents.onDidChangeContent((change) => {
  connection.sendNotification("window/showMessage", {
    type: 3, // Info
    message: `Document ${change.document.uri} has changed.`,
  });
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
  if (document) {
    const distributionHover = tryDistributionHover(document, params.position);
    if (distributionHover) return distributionHover;

    const functionHover = tryFunctionHover(document, params.position);
    if (functionHover) return functionHover;
  }
  return null;
});

documents.listen(connection);

connection.listen();
