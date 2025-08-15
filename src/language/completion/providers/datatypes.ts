import {
  type CompletionParams,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { Datatype, Keyword } from "../../../types/completion";
import { getSearchableItems } from "../util";

export const DATATYPES = [
  // Basic types
  "void",
  "int",
  "real",
  "complex",
  // Vector and matrix types
  "vector",
  "row_vector",
  "matrix",
  "complex_vector",
  "complex_row_vector",
  "complex_matrix",
  // Constrained types
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

const getDatatypes = (): Datatype[] => {
  return DATATYPES.map((datatype) => ({
    name: datatype,
  }));
};

export const provideDatatypeCompletions =
  (getDatatypesFn: () => Datatype[]) =>
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

    const datatypes = getDatatypesFn(); //getDistributions(getMathDistributionsAsStrings)();
    const searchableFunctions = getSearchableItems(datatypes, {
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

export default provideDatatypeCompletions(getDatatypes);
