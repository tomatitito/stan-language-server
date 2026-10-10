import type { Node } from "web-tree-sitter";
import type { SemanticIndexEntry } from "../ast/types.ts";

export type DocumentationTemplate = {
  /** UTF-16 offset at which to insert the template. */
  offset: number;
  newText: string;
};

const isDocumented = (fn: Node, text: string): boolean => {
  // Comments are Tree-sitter siblings, so text inside strings or function
  // bodies cannot be mistaken for documentation. Allow intervening ordinary
  // comments and blank lines without generating a second documentation block.
  let previous = fn.previousNamedSibling;
  let boundary = fn.startIndex;
  while (previous?.type === "comment" &&
         /^\s*$/.test(text.slice(previous.endIndex, boundary))) {
    if (/^(\/\*\*|\/\*!|\/\/\/|\/\/!)(?!<)/.test(previous.text)) {
      return true;
    }
    boundary = previous.startIndex;
    previous = previous.previousNamedSibling;
  }
  return false;
};

const getFunctionParameters = (declarator: Node): string[] | null => {
  const parameters = declarator.namedChildren.find((node) => node.type === "parameter_list");
  if (!parameters) {
    return null;
  }
  const names: string[] = [];
  for (const parameter of parameters.namedChildren) {
    if (parameter.type !== "parameter_declaration") {
      continue;
    }
    const name = parameter.namedChildren.find((node) => node.type === "identifier");
    if (!name) {
      return null;
    }
    names.push(name.text);
  }
  return names.length > 0 ? names : null;
};

const getDocumentationInsertion = (
  text: string,
  fn: Node,
): { lineStart: number; indentation: string } | null => {
  const precedingText = text.slice(0, fn.startIndex);
  const lineStart = Math.max(
    precedingText.lastIndexOf("\n"),
    precedingText.lastIndexOf("\r"),
  ) + 1;
  const indentation = text.slice(lineStart, fn.startIndex);
  // Do not split another statement or an inline functions block opener.
  if (!/^[\t ]*$/.test(indentation)) {
    return null;
  }
  return { lineStart, indentation };
};

const buildDocumentationString = (
  parameters: string[] | null,
  returnType: string,
): string => {
  const lines = ["/**", " * @brief", " *"];
  if (parameters) {
    lines.push(...parameters.map((name) => ` * @param ${name}`));
  }
  if (returnType !== "void") {
    lines.push(" * @return");
  }
  lines.push(" */");
  return lines.join("\n");
};

/**
 * Generate documentation for a selection within a single function signature,
 * never its leading indentation, body, or a selection spanning functions.
 * Selection boundaries and the returned insertion offset use UTF-16 offsets.
 * The entry's tree is borrowed from the workspace index and is not modified.
 */
export const provideDocumentationTemplate = (
  entry: SemanticIndexEntry,
  start: number,
  end: number,
): DocumentationTemplate | null => {
  const { text, tree } = entry;
  if (start < 0 || end < start || end > text.length) {
    return null;
  }
  let fn: Node | null = tree.rootNode.descendantForIndex(start);
  while (fn && fn.type !== "function_definition") {
    fn = fn.parent;
  }
  if (!fn) {
    return null;
  }
  const declarator = fn.namedChildren.find((node) => node.type === "function_declarator");
  const returnType = fn.namedChildren.find((node) => node.type === "return_type");
  if (!declarator || !returnType || declarator.hasError || returnType.hasError) {
    return null;
  }
  // Selection ends are exclusive; a cursor must be before the signature's end.
  if (start < fn.startIndex || start >= declarator.endIndex || end > declarator.endIndex) {
    return null;
  }
  const insertion = getDocumentationInsertion(text, fn);
  if (insertion === null) {
    return null;
  }
  const { lineStart, indentation } = insertion;

  if (isDocumented(fn, text)) {
    return null;
  }

  const parameters = getFunctionParameters(declarator);
  // Prefer the declaration's local line ending, falling back to the file's.
  const lineEndingPattern = /\r\n|\n|\r/;
  const newline = text.slice(lineStart).match(lineEndingPattern)?.[0] ??
    text.match(lineEndingPattern)?.[0] ?? "\n";
  const documentation = buildDocumentationString(parameters, returnType.text);
  return {
    offset: lineStart,
    newText: documentation.split("\n")
      .map((line) => indentation + line + newline).join(""),
  };
};
