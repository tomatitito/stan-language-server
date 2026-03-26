import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

function constraintToCompletionItem(constraint: string): CompletionItem {
  return {
    label: constraint,
    kind: CompletionItemKind.Property,
  };
}

export const CONSTRAINTS = ["lower", "upper", "offset", "multiplier"].map(
  constraintToCompletionItem,
);
