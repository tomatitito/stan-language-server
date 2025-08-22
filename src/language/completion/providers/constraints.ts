// Pure constraints provider - returns Constraint[] using existing types
import type { Constraint } from "../../../types/completion";
import { getSearchableItems } from "../util";

export interface Position {
  line: number;
  character: number;
}

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

export const provideConstraintCompletions = (
  text: string,
  position: Position,
): Constraint[] => {
  // Calculate line start position
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  const textUpToCursor = currentLine.substring(0, position.character);

  const constraints = getConstraints();
  const searchableConstraints = getSearchableItems(constraints, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const constraintName = match[1] || "";
    const completionProposals = searchableConstraints.search(constraintName);
    return completionProposals;
  }
  
  return [];
};
