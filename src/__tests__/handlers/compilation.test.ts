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
  const purpose = "formatting";

  const settings = {
    maxLineLength: 120,
    includePaths: ["/workspace/includes"],
    warnPedantic: false,
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
  });

  afterEach(() => {
    handleIncludesSpy?.mockRestore();
    stancSpy?.mockRestore();
  });

  it("returns the actual compiler output for a valid .stan file", async () => {
    const document = createDocument(
      "file:///workspace/model.stan",
      "parameters { real x; } model { x ~ normal(0, 1); }"
    );

    const result = await handleCompilation(document, mockManager, mockFolders, settings, purpose, mockLogger);

    expect(handleIncludesSpy).toHaveBeenCalledTimes(1);
    expect(handleIncludesSpy).toHaveBeenCalledWith(
      document,
      mockManager,
      mockFolders,
      settings.includePaths,
      mockLogger,
      undefined
    );

    // stanc3's StancReturn type requires `errors: undefined` on success,
    // but the runtime value omits the `errors` property entirely.
    expect(Object.hasOwn(result, "errors")).toBe(false);
    expect(result.result).toBe("parameters {\n  real x;\n}\nmodel {\n  x ~ normal(0, 1);\n}\n");
    expect(result.warnings).toEqual([]);
  });

  it("adds functions-only flag for .stanfunctions files", async () => {
    const document = createDocument(
      "file:///workspace/functions.stanfunctions",
      "real f(real x) { return x * 2; }"
    );

    const result = await handleCompilation(document, mockManager, mockFolders, settings, purpose, mockLogger);

    // stanc3's StancReturn type requires `errors: undefined` on success,
    // but the runtime value omits the `errors` property entirely.
    expect(Object.hasOwn(result, "errors")).toBe(false);
    expect(result.result).toBe("real f(real x) {\n  return x * 2;\n}");
    expect(result.warnings).toEqual([]);
  });

  it("returns compiler errors from stanc unchanged", async () => {
    stancSpy = spyOn(stancModule, "stanc");
    const compilerErrorResult: StancReturn = {
      result: undefined,
      errors: ["semantic error"],
      warnings: undefined,
    };
    stancSpy.mockReturnValueOnce(compilerErrorResult);

    const document = createDocument("file:///workspace/error.stan", "invalid stan code");
    const result = await handleCompilation(document, mockManager, mockFolders, settings, purpose, mockLogger);

    expect(result).toEqual(compilerErrorResult);
  });
});
