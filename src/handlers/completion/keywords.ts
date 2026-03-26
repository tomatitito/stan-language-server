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
  "repeat",
  "until",
  "if",
  "then",
  "else",
  "break",
  "continue",
  "return",
  // Boolean literals and target
  "true",
  "false",
  "target",
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
  "get_lp",
  // Future reserved keywords
  "struct",
  "typedef",
  "export",
  "auto",
  "extern",
  "var",
  "static",
  "array",
  "lower",
  "upper",
  "offset",
  "multiplier",
  "tuple",
  // Special identifiers
  "truncate",
  "jacobian",
].map(keywordToCompletionItem);
