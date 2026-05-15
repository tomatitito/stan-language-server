import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { STAN_FUNCTIONS } from "../../language/stan-symbols";

function functionToCompletionItem(func: string): CompletionItem {
  return {
    label: func,
    kind: CompletionItemKind.Function,
  };
}

export const FUNCTIONS = STAN_FUNCTIONS.map(functionToCompletionItem);
