// Pure constraints provider - returns Constraint[] using existing types
import type { Constraint, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

export const CONSTRAINTS = [
  "lower",
  "upper",
  "offset",
  "multiplier",
];

const getConstraints = (): Constraint[] => {
  return CONSTRAINTS.map((constraint) => ({
    name: constraint,
  }));
};

const SEARCHABLE_CONSTRAINTS = getSearchableItems(getConstraints(), {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});

export const provideConstraintCompletions = (
  text: string,
  position: Position,
): Constraint[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const constraintName = match[1] || "";
    const completionProposals = SEARCHABLE_CONSTRAINTS.search(constraintName);
    return completionProposals;
  }

  return [];
};
