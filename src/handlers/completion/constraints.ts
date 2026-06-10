import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { STAN_CONSTRAINT_NAMES } from "../../language/stan-symbols";

function constraintToCompletionItem(constraint: string): CompletionItem {
  return {
    label: constraint,
    kind: CompletionItemKind.Property,
  };
}

export const CONSTRAINTS = STAN_CONSTRAINT_NAMES.map(constraintToCompletionItem);
