import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

function datatypeToCompletionItem(datatype: string): CompletionItem {
  return {
    label: datatype,
    kind: CompletionItemKind.Class,
  };
}

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
].map(datatypeToCompletionItem);
