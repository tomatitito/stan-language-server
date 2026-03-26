import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

import { dump_stan_math_signatures } from "stanc3";
import { manual_functions } from "../hover";

function functionToCompletionItem(func: string): CompletionItem {
  return {
    label: func,
    kind: CompletionItemKind.Function,
  };
}

const getFunctions = (): CompletionItem[] => {
  const functions = dump_stan_math_signatures().split("\n");
  const functionNames = functions
    .map((line) => line.split("(", 1)[0]?.trim() ?? "")
    .filter((name) => name !== "");
  const uniqueFunctions = [...new Set([...functionNames, ...manual_functions])];
  return uniqueFunctions.map(functionToCompletionItem);
};

export const FUNCTIONS = getFunctions();
