import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { promises } from "fs";
import type { RemoteConsole } from "vscode-languageserver";
import { TextDocuments, WorkspaceFolder } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleIncludes } from "../../handlers/compilation/includes";

describe("Includes Handler", () => {

  const createMockDocument = (uri: string, content: string): TextDocument => {
    return TextDocument.create(uri, "stan", 1, content);
  };

  const createMockDocumentManager = (documents: TextDocument[] = []): TextDocuments<TextDocument> => {
    const manager = {} as TextDocuments<TextDocument>;
    manager.get = (uri: string) => documents.find(doc => doc.uri === uri);
    return manager;
  };

  const createMockWorkspaceFolders = (): WorkspaceFolder[] => [
    { uri: "file:///workspace", name: "test-workspace" }
  ];

  let mockLogger: RemoteConsole;

  beforeEach(() => {
    mockLogger = {
      warn: mock(() => { }),
    } as any;
  });

  describe("handleIncludes", () => {
    it("should return empty object when no includes found", async () => {
      const document = createMockDocument(
        "file:///test.stan",
        "parameters { real x; } model { x ~ normal(0, 1); }"
      );
      const documentManager = createMockDocumentManager();
      const workspaceFolders = createMockWorkspaceFolders();

      const result = await handleIncludes(document, documentManager, workspaceFolders, [], mockLogger);

      expect(result).toEqual({});
    });

    it("should resolve includes from workspace documents", async () => {
      const includeFilename = "helper.stan";
      const includeContent = "real helper_function(real x) { return x + 1; }";

      const includeDocument = createMockDocument(
        "file:///workspace/helper.stan",
        includeContent
      );
      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        '#include "helper.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );

      const documentManager = createMockDocumentManager([includeDocument]);
      const workspaceFolders = createMockWorkspaceFolders();

      const result = await handleIncludes(mainDocument, documentManager, workspaceFolders, [], mockLogger);

      expect(result).toEqual({
        [includeFilename]: includeContent
      });
    });

    it("should handle multiple includes from workspace", async () => {
      const includes = ["helper.stan", "constants.stan", "utils.stan"];
      const contents = [
        "real helper_function(real x) { return x + 1; }",
        "real PI = 3.14159;",
        "real square(real x) { return x * x; }"
      ];

      const includeDocuments = includes.map((filename, index) =>
        createMockDocument(`file:///workspace/${filename}`, contents[index]!)
      );

      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        includes.map(f => `#include "${f}"`).join('\n') + '\nparameters { real x; } model { x ~ normal(0, 1); }'
      );

      const documentManager = createMockDocumentManager(includeDocuments);
      const workspaceFolders = createMockWorkspaceFolders();

      const result = await handleIncludes(mainDocument, documentManager, workspaceFolders, [], mockLogger);

      const expected = Object.fromEntries(includes.map((filename, index) => [filename, contents[index]!]));
      expect(result).toEqual(expected);
    });

    it("should prioritize workspace documents over filesystem", async () => {
      const includeFilename = "config.stan";
      const workspaceContent = "real workspace_function() { return 1; }";
      const filesystemContent = "real filesystem_function() { return 2; }";

      // Set up workspace document (should be chosen)
      const includeDocument = createMockDocument(
        "file:///workspace/config.stan",
        workspaceContent
      );
      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        '#include "config.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );

      const documentManager = createMockDocumentManager([includeDocument]);
      const workspaceFolders = createMockWorkspaceFolders();

      // Mock filesystem to return different content
      const mockReadFile = spyOn(promises, "readFile").mockResolvedValue(filesystemContent);

      try {
        const result = await handleIncludes(mainDocument, documentManager, workspaceFolders, [], mockLogger);

        // Should use workspace version, NOT filesystem version
        expect(result).toEqual({
          [includeFilename]: workspaceContent
        });

        // Filesystem should not be called since workspace succeeded
        expect(mockReadFile).not.toHaveBeenCalled();
      } finally {
        mockReadFile.mockRestore();
      }
    });

    it("should fall back to filesystem when workspace document not found", async () => {
      const includeFilename = "config.stan";
      const filesystemContent = "real filesystem_function() { return 2; }";

      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        '#include "config.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );

      const reader = (filename: string) => promises.readFile(filename, "utf-8");

      // Empty document manager (no workspace documents)
      const documentManager = createMockDocumentManager([]);
      const workspaceFolders = createMockWorkspaceFolders();

      // Mock filesystem to return content
      const mockReadFile = spyOn(promises, "readFile").mockResolvedValue(filesystemContent);

      try {
        const result = await handleIncludes(mainDocument, documentManager, workspaceFolders, [], mockLogger, reader);

        // Should use filesystem version since workspace had nothing
        expect(result).toEqual({
          [includeFilename]: filesystemContent
        });

        // Filesystem should have been called as fallback
        expect(mockReadFile).toHaveBeenCalled();
      } finally {
        mockReadFile.mockRestore();
      }
    });

    it("should handle current directory includes", async () => {
      const includeFilename = "local.stan";
      const includeContent = "real local_function() { return 123; }";

      // Document in subdirectory
      const mainDocument = createMockDocument(
        "file:///workspace/subdir/main.stan",
        '#include "local.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );

      // Include document in same subdirectory (current directory)
      // The URI needs to match the exact format used by the includes handler
      const includeDocument = createMockDocument(
        "file:///workspace/subdir/local.stan",
        includeContent
      );

      const documentManager = createMockDocumentManager([includeDocument]);
      const workspaceFolders = createMockWorkspaceFolders();

      const result = await handleIncludes(mainDocument, documentManager, workspaceFolders, [], mockLogger);

      expect(result).toEqual({
        [includeFilename]: includeContent
      });
    });

  });
});
