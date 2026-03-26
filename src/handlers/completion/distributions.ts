import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

import { dump_stan_math_distributions } from "stanc3";

function distributionToCompletionItem(distribution: string): CompletionItem {
  return {
    label: distribution,
    kind: CompletionItemKind.Function,
  };
}

const getDistributions = (): CompletionItem[] => {
  const distributions = dump_stan_math_distributions()
    .split("\n")
    .map((line) => line.split(":")[0]?.trim() ?? "")
    .filter((name) => name !== "");
  return distributions.map(distributionToCompletionItem);
};

export const DISTRIBUTIONS = getDistributions();
