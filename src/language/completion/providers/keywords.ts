import {
  type CompletionParams,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Keyword } from "../../../types/completion";
import { getSearchableItems } from "../util";
const ALL_KEYWORDS = [
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
];

const getKeywords = (): Keyword[] => {
  return ALL_KEYWORDS.map((keyword) => ({
    name: keyword,
  }));
};

export const provideKeywordCompletions =
  (getKeywordsFn: () => Keyword[]) =>
  (
    params: CompletionParams,
    documents: TextDocuments<TextDocument>,
  ): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Look backwards to find the pattern ~distribution_name
    const lineStart = document.offsetAt({ line: position.line, character: 0 });
    const lineText = text.substring(lineStart, offset);

    const functions = getKeywordsFn(); //getDistributions(getMathDistributionsAsStrings)();
    const searchableFunctions = getSearchableItems(functions, {
      splitOnRegEx: /[\s_]/g,
      min: 0,
    });

    const match = lineText.match(/(?:^|\s)([\w_]+)$/);
    if (match) {
      const fnName = match[1] || "";
      const completionProposals = searchableFunctions.search(fnName);
      return completionProposals.map((d) => {
        return {
          label: d.name,
          kind: CompletionItemKind.Function,
        };
      });
    }
    return [];
  };

export default provideKeywordCompletions(getKeywords);
