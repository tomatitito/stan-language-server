// Pure distributions provider - returns Distribution[] using existing types
import type { Distribution, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

export const provideDistributionCompletions = (
  text: string,
  position: Position,
  distributions: string[],
): Distribution[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  const distributionItems: Distribution[] = distributions
    .filter((name) => name !== "")
    .map((name) => ({ name }));

  const searchableDistributions = getSearchableItems(distributionItems, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  // Look for pattern ~distribution_name
  const match = textUpToCursor.match(/.*~\s*([\w_]*)$/);
  if (match) {
    const distName = match[1] || "";
    let completionProposals;
    if (distName === "") {
      completionProposals = distributionItems;
    } else {
      completionProposals = searchableDistributions.search(distName);
    }
    return completionProposals;
  }
  
  return [];
};