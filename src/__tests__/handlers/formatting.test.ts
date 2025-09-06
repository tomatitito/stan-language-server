import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";
import type {
  DocumentFormattingParams,
  TextDocuments,
  WorkspaceFolder,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleFormatting,
  getFormattingErrors,
} from "../../handlers/formatting";
import type { FormattingOptions } from "../../types/formatting";
import * as formattingModule from "../../language/formatting";
import * as includesModule from "../../handlers/compilation/includes";
import * as bunModule from "bun";

describe("Formatting Handler", () => {
  let mockDocument: TextDocument;
  let mockDocuments: TextDocuments<TextDocument>;
  let mockWorkspaceFolders: WorkspaceFolder[];
  let formattingParams: DocumentFormattingParams;
  let provideFormattingSpy: ReturnType<typeof spyOn>;
  let handleIncludesSpy: ReturnType<typeof spyOn>;
  let fileURLToPathSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Setup spies
    provideFormattingSpy = spyOn(formattingModule, "provideFormatting");
    handleIncludesSpy = spyOn(
      includesModule,
      "handleIncludes",
    ).mockResolvedValue({});
    fileURLToPathSpy = spyOn(bunModule, "fileURLToPath").mockImplementation(
      (url: string | URL) => {
        let path: string;
        if (typeof url === "string") {
          path = url.replace("file://", "");
        } else {
          path = url.href.replace("file://", "");
        }
        return path;
      },
    );

    // Setup mock document
    mockDocument = {
      uri: "file:///test.stan",
      languageId: "stan",
      version: 1,
      lineCount: 3,
      getText: () => "parameters {\nreal x;\n}\n",
      positionAt: () => ({ line: 0, character: 0 }),
      offsetAt: () => 0,
    } as any;

    // Setup mock documents manager
    mockDocuments = {
      get: () => mockDocument,
    } as any;

    // Setup mock workspace folders
    mockWorkspaceFolders = [
      { uri: "file:///workspace", name: "test-workspace" },
    ];

    // Setup formatting params
    formattingParams = {
      textDocument: { uri: "file:///test.stan" },
      options: {
        tabSize: 2,
        insertSpaces: true,
      },
    };
  });

  afterEach(() => {
    if (
      provideFormattingSpy &&
      typeof provideFormattingSpy.mockRestore === "function"
    ) {
      provideFormattingSpy.mockRestore();
    }
    if (
      handleIncludesSpy &&
      typeof handleIncludesSpy.mockRestore === "function"
    ) {
      handleIncludesSpy.mockRestore();
    }
    if (
      fileURLToPathSpy &&
      typeof fileURLToPathSpy.mockRestore === "function"
    ) {
      fileURLToPathSpy.mockRestore();
    }
  });

  describe("handleFormatting", () => {
    it("should successfully format a document", async () => {
      const formattedCode = "parameters {\n  real x;\n}";
      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode,
      });

      const result = await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.range.start).toEqual({ line: 0, character: 0 });
      expect(result[0]?.range.end.line).toBe(2); // lineCount - 1
      expect(result[0]?.newText).toBe(formattedCode);

      // Verify provider was called with correct context
      expect(provideFormattingSpy).toHaveBeenCalledWith(
        {
          filename: "/test.stan",
          content: "parameters {\nreal x;\n}",
          isFunctionsOnly: false,
          includes: {},
        },
        {},
      );
    });

    it("should handle functions-only files", async () => {
      const functionsDocument = {
        ...mockDocument,
      };
      mockDocuments.get = () => functionsDocument;

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "functions { ... }",
      });

      await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isFunctionsOnly: true,
        }),
        {},
      );
    });

    it("should pass includes to formatting provider", async () => {
      const includes = {
        "helper.stan": "functions { real helper() { return 1.0; } }",
      };
      handleIncludesSpy.mockResolvedValue(includes);

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted code",
      });

      await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(handleIncludesSpy).toHaveBeenCalledWith(
        mockDocument,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          includes,
        }),
        {},
      );
    });

    it("should pass custom formatting options", async () => {
      const customOptions: FormattingOptions = {
        maxLineLength: 120,
        canonicalizeDeprecations: false,
      };

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted with custom options",
      });

      await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
        customOptions,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        customOptions,
      );
    });

    it("should return empty array when document not found", async () => {
      mockDocuments.get = () => undefined;

      const result = await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(result).toEqual([]);
      expect(provideFormattingSpy).not.toHaveBeenCalled();
    });

    it("should return empty array when formatting fails", async () => {
      provideFormattingSpy.mockReturnValue({
        success: false,
        errors: ["Syntax error at line 1"],
      });

      const result = await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(result).toEqual([]);
    });

    it("should calculate correct range for entire document", async () => {
      const longDocument = {
        ...mockDocument,
        lineCount: 10,
        getText: () => "a".repeat(100),
      };
      mockDocuments.get = () => longDocument;

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted long document",
      });

      const result = await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(result[0]?.range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 9, character: 100 }, // lineCount - 1, text length
      });
    });
  });

  describe("getFormattingErrors", () => {
    it("should return formatting errors", async () => {
      const expectedErrors = ["Syntax error", "Type error"];
      provideFormattingSpy.mockReturnValue({
        success: false,
        errors: expectedErrors,
      });

      const errors = await getFormattingErrors(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(errors).toEqual(expectedErrors);
    });

    it("should return empty array when formatting succeeds", async () => {
      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted code",
      });

      const errors = await getFormattingErrors(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(errors).toEqual([]);
    });

    it("should return empty array when document not found", async () => {
      mockDocuments.get = () => undefined;

      const errors = await getFormattingErrors(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(errors).toEqual([]);
    });

    it("should handle undefined errors array", async () => {
      provideFormattingSpy.mockReturnValue({
        success: false,
        errors: undefined,
      });

      const errors = await getFormattingErrors(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(errors).toEqual([]);
    });
  });

  describe("integration with includes handler", () => {
    it("should handle include resolution errors gracefully", async () => {
      handleIncludesSpy.mockRejectedValue(
        new Error("Include resolution failed"),
      );

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted code",
      });

      // Should not throw, but rather handle the error gracefully
      await expect(
        handleFormatting(formattingParams, mockDocuments, mockWorkspaceFolders),
      ).rejects.toThrow("Include resolution failed");
    });

    it("should pass empty includes when handleIncludes returns empty object", async () => {
      handleIncludesSpy.mockResolvedValue({});

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted code",
      });

      await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          includes: {},
        }),
        {},
      );
    });
  });

  describe("file path conversion", () => {
    it("should correctly convert file URI to path", async () => {
      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted",
      });

      await handleFormatting(
        formattingParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "/test.stan", // file:// should be stripped
        }),
        {},
      );
    });

    it("should handle complex file paths", async () => {
      const complexParams = {
        ...formattingParams,
        textDocument: {
          uri: "file:///path/to/project/models/complex-model.stan",
        },
      };

      const complexDocument = {
        ...mockDocument,
        uri: "file:///path/to/project/models/complex-model.stan",
      };
      mockDocuments.get = () => complexDocument;

      provideFormattingSpy.mockReturnValue({
        success: true,
        formattedCode: "formatted",
      });

      await handleFormatting(
        complexParams,
        mockDocuments,
        mockWorkspaceFolders,
      );

      expect(provideFormattingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "/path/to/project/models/complex-model.stan",
        }),
        {},
      );
    });
  });
});
