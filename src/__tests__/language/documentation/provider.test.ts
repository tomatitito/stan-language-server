import { afterEach, describe, expect, test } from "bun:test";
import type { Tree } from "web-tree-sitter";
import { parse } from "../../../language/ast/parser.ts";
import { buildSemanticIndex } from "../../../language/ast/semantic_index.ts";
import type { SemanticIndexEntry } from "../../../language/ast/types.ts";
import { provideDocumentationTemplate } from "../../../language/documentation/provider.ts";

const trees: Tree[] = [];
afterEach(() => {
  for (const tree of trees.splice(0)) {
    tree.delete();
  }
});

const createEntry = async (text: string): Promise<SemanticIndexEntry> => {
  const tree = await parse(text);
  trees.push(tree);
  return {
    uri: "file:///documentation.stan",
    version: 1,
    text,
    tree,
    semanticIndex: buildSemanticIndex(text, tree),
  };
};

const request = async (text: string, at: string, selection = "") => {
  const offset = text.indexOf(at);
  expect(offset).toBeGreaterThanOrEqual(0);
  return provideDocumentationTemplate(await createEntry(text), offset, offset + selection.length);
};

describe("documentation template provider", () => {
  test("synchronously reuses the borrowed tree without changing or deleting it", async () => {
    const text = "functions {\n  real foo(real x) { return x; }\n}";
    const entry = await createEntry(text);
    const tree = entry.tree;
    const before = tree.rootNode.toString();
    const offset = text.indexOf("foo");
    const result = provideDocumentationTemplate(entry, offset, offset);
    expect(result).not.toBeNull();
    expect(result).not.toBeInstanceOf(Promise);
    expect(provideDocumentationTemplate(entry, offset, offset)).toEqual(result);
    expect(provideDocumentationTemplate(entry, 0, 0)).toBeNull();
    expect(entry.tree).toBe(tree);
    expect(tree.rootNode.toString()).toBe(before);
  });

  test("extracts multiline, data-qualified and array parameters structurally", async () => {
    const text = `functions {
  array[] real transform(
    data array[,] real values, // not a parameter
    vector weights, real scale
  ) { return values[1]; }
}`;
    expect(await request(text, "weights")).toEqual({
      offset: text.indexOf("  array"),
      newText: "  /**\n   * @brief\n   *\n   * @param values\n   * @param weights\n   * @param scale\n   * @return\n   */\n",
    });
  });

  test.each(["\n", "\r\n", "\r"])("preserves tabs and line ending %j", async (newline) => {
    const text = ["functions {", "\tvoid notify() { print(1); }", "}"].join(newline);
    const edit = await request(text, "notify");
    const template = ["\t/**", "\t * @brief", "\t *", "\t */", ""].join(newline);
    expect(edit).toEqual({ offset: text.indexOf("\tvoid"), newText: template });
    if (!edit) throw new Error("Expected a documentation template");
    const updated = text.slice(0, edit.offset) + edit.newText + text.slice(edit.offset);
    expect(updated).toBe(["functions {", template + "\tvoid notify() { print(1); }", "}"].join(newline));
    expect(await request(updated, "notify")).toBeNull();
  });

  test.each(["real constant() { return 1; }", "real constant();"])(
    "includes return for a no-parameter non-void function: %s",
    async (signature) => {
      const text = `functions {\n${signature}\n}`;
      expect(await request(text, "constant")).toEqual({
        offset: text.indexOf(signature),
        newText: "/**\n * @brief\n *\n * @return\n */\n",
      });
    },
  );

  test.each(["/** docs */", "/*! docs */", "/// docs", "//! docs", "/** docs */\n\n  // note"])(
    "does not duplicate preceding documentation: %s",
    async (comment) => {
      expect(await request(`functions {\n  ${comment}\n  real foo(real x) { return x; }\n}`, "foo")).toBeNull();
    },
  );

  test("ordinary comments and another function's docs do not suppress the template", async () => {
    const text = `functions {
  /** docs */
  real first() { return 1; }
  // ordinary note
  /* ordinary block */
  real second() { return 2; }
}`;
    expect(await request(text, "second")).not.toBeNull();
  });

  test.each(["/**< docs */", "/*!< docs */", "///< docs", "//!< docs"])(
    "trailing documentation belongs to the preceding declaration: %s",
    async (comment) => {
      const text = `functions {\n  real first(); ${comment}\n  real second();\n}`;
      expect(await request(text, "second")).not.toBeNull();
    },
  );

  test("available only within the signature, not leading indentation or body", async () => {
    const text = "functions {\n  real foo(real x) {\n    return x;\n  }\n}\nmodel {}";
    for (const at of ["real foo", " foo", "foo", "real x", ")"]) {
      expect(await request(text, at)).not.toBeNull();
    }
    for (const at of ["  real", "functions", " {\n    return", "{\n    return", "return", "model"]) {
      expect(await request(text, at)).toBeNull();
    }
    expect(await request(text, "  real", "  real foo(real x)")).toBeNull();
    expect(await request(text, "real foo", "real foo(real x)")).not.toBeNull();
    expect(await request(text, "real foo", "real foo(real x) {\n    return")).toBeNull();
  });

  test("targets the selected function and rejects ranges spanning functions", async () => {
    const text = "functions {\n  real first() { return 1; }\n  void second() {}\n}";
    expect(await request(text, "second")).toEqual({
      offset: text.indexOf("  void"),
      newText: "  /**\n   * @brief\n   *\n   */\n",
    });
    const entry = await createEntry(text);
    expect(provideDocumentationTemplate(
      entry, text.indexOf("first"), text.indexOf("second") + "second()".length,
    )).toBeNull();
    expect(provideDocumentationTemplate(entry, 20, 10)).toBeNull();
  });

  test("rejects incomplete signatures and inline declarations", async () => {
    expect(await request("functions {\n real foo(real) { return 1; }\n}", "foo")).toBeNull();
    expect(await request("functions { real foo() { return 1; } }", "foo")).toBeNull();
  });

  test("uses UTF-16 offsets after non-ASCII text", async () => {
    const text = "// 😀 café\nfunctions {\n  real foo(real x) { return x; }\n}";
    expect(await request(text, "foo")).toEqual({
      offset: text.indexOf("  real"),
      newText: "  /**\n   * @brief\n   *\n   * @param x\n   * @return\n   */\n",
    });
  });
});
