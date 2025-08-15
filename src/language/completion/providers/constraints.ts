import { type CompletionParams, TextDocuments, CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { Constraint } from "../../../types/completion";
import { getSearchableItems } from "../util";

export const CONSTRAINTS = [
  "lower",
  "upper",
  "offset",
  "multiplier",
  "ordered",
  "positive_ordered",
  "simplex",
  "unit_vector",
  "sum_to_zero_vector",
  "cholesky_factor_corr",
  "cholesky_factor_cov",
  "corr_matrix",
  "cov_matrix",
  "stochastic_column_matrix",
  "stochastic_row_matrix",
];

const getConstraints = (): Constraint[] => {
  return CONSTRAINTS.map((constraint) => ({
    name: constraint,
  }));
};

export const provideConstraintCompletions =
  (getConstraintsFn: () => Constraint[]) =>
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

    const constraints = getConstraintsFn(); //getDistributions(getMathDistributionsAsStrings)();
    const searchableFunctions = getSearchableItems(constraints, {
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

export default provideConstraintCompletions(getConstraints);
