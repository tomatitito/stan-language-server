// Pure distributions provider - returns Distribution[] using existing types
import type { Distribution } from "../../../types/completion";
import { getSearchableItems } from "../util";

export interface Position {
  line: number;
  character: number;
}

export const provideDistributionCompletions = (
  text: string,
  position: Position,
  distributions: string[],
): Distribution[] => {
  // Calculate line start position
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  const textUpToCursor = currentLine.substring(0, position.character);

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