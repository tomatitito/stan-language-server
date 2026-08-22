import { beforeEach, describe, expect, it, mock } from "bun:test";
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

    it("should prioritize open documents over filesystem content", async () => {
      const includeFilename = "config.stan";
      const workspaceContent = "real workspace_function() { return 1; }";
      const includeDocument = createMockDocument(
        "file:///workspace/config.stan",
        workspaceContent
      );
      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        '#include "config.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );
      const documentManager = createMockDocumentManager([includeDocument]);
      let reads = 0;
      const reader = async (uri: string) => {
        reads += 1;
        return { uri, text: "disk", version: "disk-1", location: "disk" as const };
      };

      const result = await handleIncludes(
        mainDocument,
        documentManager,
        createMockWorkspaceFolders(),
        [],
        mockLogger,
        reader,
      );

      expect(result).toEqual({ [includeFilename]: workspaceContent });
      expect(reads).toBe(0);
    });

    it("should fall back to filesystem when document is not open", async () => {
      const includeFilename = "config.stan";
      const filesystemContent = "real filesystem_function() { return 2; }";
      const mainDocument = createMockDocument(
        "file:///workspace/main.stan",
        '#include "config.stan"\nparameters { real x; } model { x ~ normal(0, 1); }'
      );
      const reader = async (uri: string) => ({
        uri,
        text: filesystemContent,
        version: "disk-1",
        location: "disk" as const,
      });

      const result = await handleIncludes(
        mainDocument,
        createMockDocumentManager([]),
        createMockWorkspaceFolders(),
        [],
        mockLogger,
        reader,
      );

      expect(result).toEqual({ [includeFilename]: filesystemContent });
    });

    it("should continue after an unreadable include candidate", async () => {
      const mainDocument = createMockDocument(
        "file:///current/main.stan",
        '#include "config.stan"',
      );
      const reader = async (uri: string) => {
        if (uri.startsWith("file:///current/")) {
          throw new Error("unreadable");
        }
        return {
          uri,
          text: "real workspace_function() { return 1; }",
          version: "disk-1",
          location: "disk" as const,
        };
      };

      const result = await handleIncludes(
        mainDocument,
        createMockDocumentManager([]),
        createMockWorkspaceFolders(),
        [],
        mockLogger,
        reader,
      );

      expect(result["config.stan"]).toContain("workspace_function");
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
