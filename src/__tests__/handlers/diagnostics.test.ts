import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { DiagnosticSeverity, TextDocuments, type RemoteConsole } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SERVER_ID } from "../../constants";
import * as compilationModule from "../../handlers/compilation/compilation";
import { handleDiagnostics } from "../../handlers/diagnostics";
import * as diagnosticsModule from "../../language/diagnostics/provider";

// const { handleDiagnostics } = diagnosticsModule;

describe("Diagnostic Handler", () => {
  const defaultSettings = { maxLineLength: 78, includePaths: [] };
  const documentUri = "file:///test.stan";
  const document = TextDocument.create(documentUri, "stan", 1, "stan code here")
  const params = {
    textDocument: { uri: documentUri }
  }

  const mockDocuments = {
    get: (uri: string) => uri === documentUri ? document : undefined,
  } as TextDocuments<TextDocument>;
  let mockLogger: RemoteConsole;
  let mockProvideDiagnostics: any;
  let mockHandleCompilation: any

  beforeEach(() => {
    mockLogger = {
      warn: mock(() => { }),
    } as any;
    mockHandleCompilation = spyOn(compilationModule, "handleCompilation").mockResolvedValue({ errors: undefined, result: "successful compilation result" });
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

  it("should process warnings from successful compilation", async () => {
    const providedDiagnostic = {
      range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
      message: "some compiler message",
      severity: "warning"
    };
    mockProvideDiagnostics.mockReturnValue([providedDiagnostic]);

    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

    expect(result[0]?.severity).toEqual(DiagnosticSeverity.Warning);
    expect(result[0]?.message).toEqual(providedDiagnostic.message);
    expect(result[0]?.range).toEqual(providedDiagnostic.range);
    expect(result[0]?.source).toEqual(SERVER_ID);
  });

  it("should process errors from failed compilation", async () => {
    const providedDiagnostic = {
      range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
      message: "some compiler message",
      severity: "error"
    };
    mockProvideDiagnostics.mockReturnValue([providedDiagnostic]);

    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

    expect(result[0]?.severity).toEqual(DiagnosticSeverity.Error);
    expect(result[0]?.message).toEqual(providedDiagnostic.message);
    expect(result[0]?.range).toEqual(providedDiagnostic.range);
    expect(result[0]?.source).toEqual(SERVER_ID);
  });

  it("should report multiple warnings when present", async () => {
    const providedDiagnostics = [
      {
        range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
        message: "some compiler message",
        severity: "warning"
      },
      {
        range: { start: { line: 3, character: 3 }, end: { line: 4, character: 4 } },
        message: "another compiler message",
        severity: "warning"
      }];
    mockProvideDiagnostics.mockReturnValue(providedDiagnostics);

    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);
    const uniqueSeverities = new Set(result.map((diagnostic) => diagnostic.severity));

    expect(result).toHaveLength(2);
    expect(uniqueSeverities).toHaveLength(1);
    expect(uniqueSeverities).toContain(DiagnosticSeverity.Warning);
  });

  it("should report warnings and errors when both are present", async () => {
    const providedDiagnostics = [
      {
        range: { start: { line: 1, character: 1 }, end: { line: 2, character: 2 } },
        message: "some compiler message",
        severity: "error"
      },
      {
        range: { start: { line: 3, character: 3 }, end: { line: 4, character: 4 } },
        message: "another compiler message",
        severity: "warning"
      }];
    mockProvideDiagnostics.mockReturnValue(providedDiagnostics);

    const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

    expect(result).toHaveLength(2);
    expect(result.map((diagnostic) => diagnostic.severity)).toContainAllValues([DiagnosticSeverity.Error, DiagnosticSeverity.Warning]);
  })
});
