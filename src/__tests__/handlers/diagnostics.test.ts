import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { DiagnosticSeverity, TextDocuments, type RemoteConsole } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SERVER_ID } from "../../constants";
import * as compilationModule from "../../handlers/compilation/compilation";
import { handleDiagnostics } from "../../handlers/diagnostics";
import * as diagnosticsModule from "../../language/diagnostics/provider";

describe("Diagnostic Handler", () => {
  const defaultSettings = { maxLineLength: 78, includePaths: [], warnPedantic: false };
  const documentUri = "file:///test.stan";
  const document = TextDocument.create(documentUri, "stan", 1, "stan code here");
  const params = {
    textDocument: { uri: documentUri },
  };

  const mockDocuments = {
    get: (uri: string) => (uri === documentUri ? document : undefined),
  } as TextDocuments<TextDocument>;

  let mockLogger: RemoteConsole;
  let mockProvideDiagnostics: any;
  let mockHandleCompilation: any;

  beforeEach(() => {
    mockLogger = {
      warn: mock(() => {}),
    } as any;
    mockHandleCompilation = spyOn(compilationModule, "handleCompilation").mockResolvedValue({
      errors: undefined,
      result: "successful compilation result",
    });
    mockProvideDiagnostics = spyOn(diagnosticsModule, "provideDiagnostics");
  });

  afterEach(() => {
    mockProvideDiagnostics?.mockRestore();
    mockHandleCompilation?.mockRestore();
  });

  it("should return empty array for successful compilation without warnings", async () => {
    mockProvideDiagnostics.mockReturnValue([]);
    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

    expect(result).toHaveLength(0);
  });

  const diagnosticsCases = [
    {
      name: "single warning diagnostic",
      providedDiagnostics: [
        {
          range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
          message: "warning compiler message",
          severity: "warning",
        },
      ],
      expectedSeverities: [DiagnosticSeverity.Warning],
    },
    {
      name: "single error diagnostic",
      providedDiagnostics: [
        {
          range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
          message: "error compiler message",
          severity: "error",
        },
      ],
      expectedSeverities: [DiagnosticSeverity.Error],
    },
    {
      name: "mixed warning and error diagnostics",
      providedDiagnostics: [
        {
          range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
          message: "error compiler message",
          severity: "error",
        },
        {
          range: { start: { line: 3, character: 3 }, end: { line: 4, character: 4 } },
          message: "warning compiler message",
          severity: "warning",
        },
      ],
      expectedSeverities: [DiagnosticSeverity.Error, DiagnosticSeverity.Warning],
    },
    {
      name: "multiple warning diagnostics",
      providedDiagnostics: [
        {
          range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
          message: "first warning message",
          severity: "warning",
        },
        {
          range: { start: { line: 3, character: 3 }, end: { line: 4, character: 4 } },
          message: "second warning message",
          severity: "warning",
        },
      ],
      expectedSeverities: [DiagnosticSeverity.Warning, DiagnosticSeverity.Warning],
    },
  ];

  for (const { name, providedDiagnostics, expectedSeverities } of diagnosticsCases) {
    it(`should map ${name}`, async () => {
      mockProvideDiagnostics.mockReturnValue(providedDiagnostics);

      const result = await handleDiagnostics(
        params,
        mockDocuments,
        [],
        defaultSettings,
        mockLogger
      );

      expect(result).toHaveLength(providedDiagnostics.length);
      expect(result.map((diagnostic) => diagnostic.severity)).toEqual(expectedSeverities);

      result.forEach((diagnostic, idx) => {
        const providedDiagnostic = providedDiagnostics[idx];
        expect(providedDiagnostic).toBeDefined();
        if (!providedDiagnostic) return;

        expect(diagnostic.message).toEqual(providedDiagnostic.message);
        expect(diagnostic.range).toEqual(providedDiagnostic.range);
        expect(diagnostic.source).toEqual(SERVER_ID);
      });
    });
  }

  it("should return empty array when document is not found", async () => {
    const missingDocumentParams = {
      textDocument: { uri: "file:///missing.stan" },
    };
    const result = await handleDiagnostics(
      missingDocumentParams,
      mockDocuments,
      [],
      defaultSettings,
      mockLogger
    );

    expect(result).toEqual([]);
    expect(mockHandleCompilation).not.toHaveBeenCalled();
  });

  it("should ignore diagnostics with unknown severity", async () => {
    const providedDiagnostic = {
      range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
      message: "some compiler message",
      severity: "info",
    };
    mockProvideDiagnostics.mockReturnValue([providedDiagnostic]);

    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

    expect(result).toHaveLength(0);
  });
});
