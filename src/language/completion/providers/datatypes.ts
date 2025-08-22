// Pure datatypes provider - returns Datatype[] using existing types
import type { Datatype, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

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

export const provideDatatypeCompletions = (
  text: string,
  position: Position,
): Datatype[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  const datatypes = getDatatypes();
  const searchableDatatypes = getSearchableItems(datatypes, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const typeName = match[1] || "";
    const completionProposals = searchableDatatypes.search(typeName);
    return completionProposals;
  }
  
  return [];
};