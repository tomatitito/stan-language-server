import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { STAN_KEYWORDS } from "../../language/stan-symbols";

function keywordToCompletionItem(keyword: string): CompletionItem {
  return {
    label: keyword,
    kind: CompletionItemKind.Keyword,
  };
}

export const KEYWORDS = STAN_KEYWORDS.map(keywordToCompletionItem);
