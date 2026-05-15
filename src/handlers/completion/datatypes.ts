import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { STAN_DATATYPES } from "../../language/stan-symbols";

function datatypeToCompletionItem(datatype: string): CompletionItem {
  return {
    label: datatype,
    kind: CompletionItemKind.Class,
  };
}

export const DATATYPES = STAN_DATATYPES.map(datatypeToCompletionItem);
