import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { STAN_DISTRIBUTIONS } from "../../language/stan-symbols";

function distributionToCompletionItem(distribution: string): CompletionItem {
  return {
    label: distribution,
    kind: CompletionItemKind.Function,
  };
}

export const DISTRIBUTIONS = STAN_DISTRIBUTIONS.map(distributionToCompletionItem);
