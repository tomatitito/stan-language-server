import { describe, expect, it, spyOn, beforeEach, afterEach } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { TextDocuments, WorkspaceFolder } from "vscode-languageserver";
import { handleCompilation } from "../../handlers/compilation/compilation";
import * as includesModule from "../../handlers/compilation/includes";

describe("Compilation Handler", () => {
  let handleIncludesSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    handleIncludesSpy = spyOn(includesModule, "handleIncludes").mockResolvedValue({});
  });

  afterEach(() => {
    if (handleIncludesSpy && typeof handleIncludesSpy.mockRestore === 'function') {
      handleIncludesSpy.mockRestore();
    }
  });

  const createDocument = (uri: string, content: string, languageId = "stan"): TextDocument => {
    return TextDocument.create(uri, languageId, 1, content);
  };

  const mockManager = {} as TextDocuments<TextDocument>;
  const mockFolders: WorkspaceFolder[] = [{ uri: "file:///workspace", name: "test" }];

  it("should compile Stan model successfully", async () => {
    const document = createDocument("file:///test.stan", "parameters { real x; } model { x ~ normal(0, 1); }");
    const result = await handleCompilation(document, mockManager, mockFolders);

    expect(result.errors).toBeUndefined();
    expect(typeof result.result).toBe("string");
  });

  it("should add functions-only flag for stanfunctions", async () => {
    const document = createDocument("file:///functions.stanfunctions", "real f(real x) { return x * 2; }", "stan");
    const result = await handleCompilation(document, mockManager, mockFolders);

    expect(result.errors).toBeUndefined();
    expect(typeof result.result).toBe("string");
  });

  it("should handle compilation errors", async () => {
    const document = createDocument("file:///error.stan", "invalid stan code");
    const result = await handleCompilation(document, mockManager, mockFolders);

    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.result).toBeUndefined();
  });
});
