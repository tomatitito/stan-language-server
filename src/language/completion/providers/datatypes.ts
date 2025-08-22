// Pure datatypes provider - returns Datatype[] using existing types
import type { Datatype } from "../../../types/completion";
import { getSearchableItems } from "../util";

export interface Position {
  line: number;
  character: number;
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
  // Calculate line start position
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  const textUpToCursor = currentLine.substring(0, position.character);

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