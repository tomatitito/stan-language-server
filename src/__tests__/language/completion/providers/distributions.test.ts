import { describe, expect, it } from "bun:test";
import {
  CompletionItemKind,
  type CompletionParams,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideDistributionCompletions } from "../../../../language/completion/providers/distributions";
import type { Distribution } from "../../../../types/completion";

// Helper function to create a mock text document
const createMockDocument = (
  content: string,
  uri = "file:///test.stan",
): TextDocument => {
  return TextDocument.create(uri, "stan", 1, content);
};

// Helper function to create mock completion params
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

// Helper function to create a mock documents collection
const createMockDocuments = (document: TextDocument) => ({
  get: (uri: string) => (uri === document.uri ? document : undefined),
});

describe("Distribution Pattern Recognition", () => {
  const mockDistributions: Distribution[] = [
    { name: "normal" },
    { name: "uniform" },
    { name: "exponential" },
    { name: "beta" },
    { name: "beta_binomial" },
  ];

  const getMockDistributions = () => mockDistributions;
  const provider = provideDistributionCompletions(getMockDistributions);

  it("returns all distributions for empty completion context", () => {
    const content = "y ~ ";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 4);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.label)).toEqual([
      "normal",
      "uniform",
      "exponential",
      "beta",
      "beta_binomial",
    ]);
    expect(result.every((r) => r.kind === CompletionItemKind.Function)).toBe(
      true,
    );
  });

  it("returns filtered distributions for prefix matching", () => {
    const content = "y ~ norm";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 8);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("normal");
    expect(result[0]?.kind).toBe(CompletionItemKind.Function);
  });

  it("returns empty array for non-distribution context", () => {
    const content = "y = ";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 4);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toEqual([]);
  });

  it("handles multiple tildes on line, captures rightmost", () => {
    const content = "x ~ normal(0, 1); y ~ exp";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 25);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("exponential");
  });

  it("handles variable whitespace after tilde", () => {
    const content = "y ~    norm";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 11);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("normal");
  });

  it("handles underscore in distribution names", () => {
    const content = "y ~ beta_";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 9);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);
    const resultLabels = result.map((item) => item.label);

    expect(result).toHaveLength(2);
    expect(resultLabels).toContainAllValues(["beta_binomial", "beta"])
  });

  it("returns empty array for non-matching prefix", () => {
    const content = "y ~ xyz";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 7);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toEqual([]);
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
    const content = "y ~ norm";
    const document = createMockDocument(content);
    const params = createMockCompletionParams(document, 0, 8);
    const documents = createMockDocuments(document);

    const result = provider(params, documents as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: "normal",
      kind: CompletionItemKind.Function,
    });
  });
});
