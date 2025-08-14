import { describe, expect, it } from "bun:test";
import {
  CompletionItemKind,
  type CompletionParams,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideFunctionCompletions } from "../../../../language/completion/providers/functions";

const createMockDocument = (
  content: string,
  uri = "file:///test.stan",
): TextDocument => {
  return TextDocument.create(uri, "stan", 1, content);
};

const createMockCompletionParams = (
  document: TextDocument,
  line: number,
  character: number,
): CompletionParams => {
  return {
    textDocument: { uri: document.uri },
    position: { line, character },
  };
};

const createMockDocuments = (document: TextDocument) => ({
  get: (uri: string) => (uri === document.uri ? document : undefined),
});

describe("Function Completion Provider", () => {
  const getMockFunctions = () => [
    { name: "add" },
    { name: "subtract" },
    { name: "foo" },
    { name: "bar" },
    { name: "baz" },
  ];
  const provider = provideFunctionCompletions(getMockFunctions);
  
  it("should provide completion items", async () => {
    const document = createMockDocument("myvar = foo(alpha, beta);");
    const documents = createMockDocuments(document);
    const params = createMockCompletionParams(document, 0, 9);
    
    const result = provider(params, documents as any)
    expect(result).toHaveLength(1)
    expect(result.map(item => item.label)).toContain("foo")
  });
  
  it("should provide multiple completion items", async () => {
    const document = createMockDocument("myvar = baz(alpha, beta);");
    const documents = createMockDocuments(document);
    const params = createMockCompletionParams(document, 0, 9);
    
    const result = provider(params, documents as any)
    expect(result).toHaveLength(2)
    expect(result.map(item => item.label)).toContainAllValues(["bar", "baz"])
  });
  
  it("should return an empty array for non-matching prefix", async () => {
    const document = createMockDocument("myvar = quux(alpha, beta);");
    const documents = createMockDocuments(document);
    const params = createMockCompletionParams(document, 0, 9);
    
    const result = provider(params, documents as any)
    expect(result).toHaveLength(0)
  });
  
  it("handles variable whitespace", () => {
    const content = "myvar =    subtract(1, 2)";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 12);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result.map(item => item.label)).toContain("subtract");
  });

  it("returns empty array for invalid document URI", () => {
    const content = "y ~ norm";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 8);
    const documents = createMockDocuments(document);

    // Change the URI in params to something that doesn't exist
    params.textDocument.uri = "file:///nonexistent.stan";

    const result = provider(params, documents as any);

    expect(result).toEqual([]);
  });

  it("returns correctly structured CompletionItems", () => {
    const content = "myvar = foo()";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 9);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: "foo",
      kind: CompletionItemKind.Function,
    });
  });
  
});
