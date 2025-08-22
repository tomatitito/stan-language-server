// Pure keywords provider - returns Keyword[] using existing types
import type { Keyword, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

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

export const provideKeywordCompletions = (
  text: string,
  position: Position,
): Keyword[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  const keywords = getKeywords();
  const searchableKeywords = getSearchableItems(keywords, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const keywordName = match[1] || "";
    const completionProposals = searchableKeywords.search(keywordName);
    return completionProposals;
  }
  
  return [];
};