import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Tree } from "web-tree-sitter";
import { parse } from "../../../language/ast/parser";
import { buildSemanticIndex } from "../../../language/ast/semantic_index";
import type { SemanticIndexEntry } from "../../../language/ast/types";
import { provideDefinition } from "../../../language/definition/provider";

describe("Definition provider", () => {
  let tree: Tree | undefined;

  beforeEach(() => {
    tree = undefined;
  });

  afterEach(() => {
    tree?.delete();
  });

  it("resolves a variable reference to its declaration", async () => {
    const text = "parameters {\n  real foo;\n}\nmodel {\n  target += foo;\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///variable.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    const result = provideDefinition(entry, { line: 4, character: 13 });

    expect(result).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });
  });

  it("resolves a user-defined function call to its function name", async () => {
    const text = "functions {\n  real foo(real x) { return x; }\n}\nmodel {\n  target += foo(1.0);\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///function.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    const result = provideDefinition(entry, { line: 4, character: 13 });

    expect(result).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });
  });

  it("resolves a function parameter reference to its declaration", async () => {
    const text = "functions {\n  real foo(real x) {\n    return x;\n  }\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///parameter.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    const result = provideDefinition(entry, { line: 2, character: 11 });

    expect(result).toEqual({
      start: { line: 1, character: 16 },
      end: { line: 1, character: 17 },
    });
  });

  it("resolves a loop variable reference to its declaration", async () => {
    const text = "model {\n  for (i in 1:3) {\n    target += i;\n  }\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///loop.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    const result = provideDefinition(entry, { line: 2, character: 14 });

    expect(result).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 8 },
    });
  });

  it("resolves inner and outer references to their respective declarations", async () => {
    const text = "parameters {\n  real foo;\n}\nmodel {\n  {\n    real foo = 1;\n    target += foo;\n  }\n  target += foo;\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///shadowing.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    expect(provideDefinition(entry, { line: 6, character: 15 })).toEqual({
      start: { line: 5, character: 9 },
      end: { line: 5, character: 12 },
    });
    expect(provideDefinition(entry, { line: 8, character: 13 })).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });
  });

  it("returns a declaration's own range", async () => {
    const text = "parameters {\n  real foo;\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///declaration.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    const result = provideDefinition(entry, { line: 1, character: 8 });

    expect(result).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });
  });

  it("returns an overloaded function declaration's range despite rename restrictions", async () => {
    const text = "functions {\n  real foo(real x) { return x; }\n  real foo(real x, real y) { return x + y; }\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///overloaded-declaration.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };
    const declaration = [...entry.semanticIndex.nameInfoByNodeId.values()]
      .find((info) => info.kind === "declaration" && !info.renameable);
    expect(declaration).toBeDefined();

    const result = provideDefinition(entry, { line: 1, character: 8 });

    expect(result).toEqual({
      start: { line: 1, character: 7 },
      end: { line: 1, character: 10 },
    });
  });

  it("returns null for a built-in function call", async () => {
    const text = "model {\n  target += square(2.0);\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///builtin.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    expect(provideDefinition(entry, { line: 1, character: 13 })).toBeNull();
  });

  it("returns null for an unresolved identifier", async () => {
    const text = "model {\n  target += missing;\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///unresolved.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    expect(provideDefinition(entry, { line: 1, character: 13 })).toBeNull();
  });

  it("returns null for an overloaded function call", async () => {
    const text = "functions {\n  real foo(real x) { return x; }\n  real foo(real x, real y) { return x + y; }\n}\nmodel {\n  target += foo(1.0);\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///overloaded-call.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    expect(provideDefinition(entry, { line: 5, character: 13 })).toBeNull();
  });

  it.each([
    { label: "whitespace", line: 4, character: 1 },
    { label: "punctuation", line: 4, character: 10 },
    { label: "comment", line: 5, character: 6 },
    { label: "exclusive identifier end", line: 4, character: 15 },
  ])("returns null on $label", async ({ line, character }) => {
    const text = "parameters {\n  real foo;\n}\nmodel {\n  target += foo;\n  // foo\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///nonidentifier.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    expect(provideDefinition(entry, { line, character })).toBeNull();
  });

  it.each([
    { label: "LF", newline: "\n" },
    { label: "CRLF", newline: "\r\n" },
  ])("uses UTF-16 positions with $label line endings", async ({ newline }) => {
    const text = [
      "parameters {",
      "  /* 😀 */ real foo;",
      "}",
      "model {",
      "  /* 😀 */ target += foo;",
      "}",
    ].join(newline);
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///unicode.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };

    // The emoji occupies two UTF-16 code units but four UTF-8 bytes.
    const result = provideDefinition(entry, { line: 4, character: 22 });

    expect(result).toEqual({
      start: { line: 1, character: 16 },
      end: { line: 1, character: 19 },
    });
  });

  it("preserves borrowed tree and semantic index across repeated calls", async () => {
    const text = "parameters {\n  real foo;\n}\nmodel {\n  target += foo;\n}";
    tree = await parse(text);
    const entry: SemanticIndexEntry = {
      uri: "file:///borrowed.stan", version: 1, text, tree,
      semanticIndex: buildSemanticIndex(text, tree),
    };
    const originalTree = tree.rootNode.toString();
    const originalIndex = structuredClone(entry.semanticIndex);

    for (let call = 0; call < 2; call += 1) {
      expect(provideDefinition(entry, { line: 4, character: 13 })).toEqual({
        start: { line: 1, character: 7 },
        end: { line: 1, character: 10 },
      });
    }

    expect(tree.rootNode.toString()).toBe(originalTree);
    expect(entry.semanticIndex).toEqual(originalIndex);
  });
});
