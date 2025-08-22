// Pure constraints provider - returns Constraint[] using existing types
import type { Constraint, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

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
  const textUpToCursor = getTextUpToCursor(text, position);

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
