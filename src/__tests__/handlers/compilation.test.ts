import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { RemoteConsole, TextDocuments, WorkspaceFolder } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { StancReturn } from "stanc3";
import * as stancModule from "stanc3";
import { handleCompilation } from "../../handlers/compilation/compilation";
import * as includesModule from "../../handlers/compilation/includes";

describe("Compilation Handler", () => {
  const mockManager = {} as TextDocuments<TextDocument>;
  const mockFolders: WorkspaceFolder[] = [{ uri: "file:///workspace", name: "test" }];

  const settings = {
    maxLineLength: 120,
    includePaths: ["/workspace/includes"],
  };

  const createDocument = (uri: string, content: string, languageId = "stan"): TextDocument => {
    return TextDocument.create(uri, languageId, 1, content);
  };

  let mockLogger: RemoteConsole;
  let handleIncludesSpy: ReturnType<typeof spyOn>;
  let stancSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockLogger = {
      warn: mock(() => {}),
    } as any;

    handleIncludesSpy = spyOn(includesModule, "handleIncludes").mockResolvedValue({
      "foo.stan": "real foo;",
    });
    stancSpy = spyOn(stancModule, "stanc").mockReturnValue({
      result: "formatted-model",
      errors: undefined,
      warnings: undefined,
    } as StancReturn);
  });

  afterEach(() => {
    handleIncludesSpy?.mockRestore();
    stancSpy?.mockRestore();
  });

  it("passes expected arguments to include resolution and stanc", async () => {
    const document = createDocument(
      "file:///workspace/model.stan",
      "parameters { real x; } model { x ~ normal(0, 1); }"
    );

    await handleCompilation(document, mockManager, mockFolders, settings, mockLogger);

    expect(handleIncludesSpy).toHaveBeenCalledTimes(1);
    expect(handleIncludesSpy).toHaveBeenCalledWith(
      document,
      mockManager,
      mockFolders,
      settings.includePaths,
      mockLogger,
      undefined
    );

    expect(stancSpy).toHaveBeenCalledTimes(1);
    expect(stancSpy).toHaveBeenCalledWith(
      "/workspace/model.stan",
      "parameters { real x; } model { x ~ normal(0, 1); }",
      [
        "auto-format",
        "filename-in-msg=/workspace/model.stan",
        "max-line-length=120",
        "canonicalze=deprecations",
        "allow-undefined",
      ],
      { "foo.stan": "real foo;" }
    );
  });

  it("adds functions-only flag for .stanfunctions files", async () => {
    const document = createDocument(
      "file:///workspace/functions.stanfunctions",
      "real f(real x) { return x * 2; }"
    );

    await handleCompilation(document, mockManager, mockFolders, settings, mockLogger);

    const stancArgs = stancSpy.mock.calls[0]?.[2];
    expect(Array.isArray(stancArgs)).toBe(true);
    expect(stancArgs).toContain("functions-only");
  });

  it("returns compiler errors from stanc unchanged", async () => {
    const compilerErrorResult: StancReturn = {
      result: undefined,
      errors: ["semantic error"],
      warnings: undefined,
    };
    stancSpy.mockReturnValueOnce(compilerErrorResult);

    const document = createDocument("file:///workspace/error.stan", "invalid stan code");
    const result = await handleCompilation(document, mockManager, mockFolders, settings, mockLogger);

    expect(result).toEqual(compilerErrorResult);
  });
});
