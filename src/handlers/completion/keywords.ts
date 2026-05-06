import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

function keywordToCompletionItem(keyword: string): CompletionItem {
  return {
    label: keyword,
    kind: CompletionItemKind.Keyword,
  };
}

export const KEYWORDS = [
  // Control flow
  "for",
  "in",
  "while",
  "if",
  "then",
  "else",
  "break",
  "continue",
  "return",
  // Block identifiers
  "functions",
  "data",
  "transformed",
  "parameters",
  "model",
  "generated",
  "quantities",
  // Built-in functions
  "print",
  "reject",
  "fatal_error",
  "profile",
  // constraints
  "lower",
  "upper",
  "offset",
  "multiplier",
  // Special identifiers
  "target",
  "jacobian",
].map(keywordToCompletionItem);
