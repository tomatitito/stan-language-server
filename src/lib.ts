import {
  TextDocuments,
  type InitializeParams,
  TextDocumentSyncKind,
  type InitializeResult,
  type Connection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI, Utils as URIUtils } from "vscode-uri";
import { promises as fs } from "fs";

import { handleCompletion, handleDiagnostics, handleHover } from "./handlers";

import { compile } from "./stanc/compiler";
import { getIncludes } from "./stanc/includes";

const setUpLanguageServer = (connection: Connection) => {
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

  const documents = new TextDocuments(TextDocument);

  connection.onCompletion((params) => {
    return handleCompletion(params, documents);
  });

  connection.onRequest("textDocument/diagnostic", async (params) => {
    return {
      kind: "full",
      items: await handleDiagnostics(params, documents),
    };
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
    return handleHover(document, params);
  });

  documents.listen(connection);

  connection.listen();
};

export default setUpLanguageServer;
