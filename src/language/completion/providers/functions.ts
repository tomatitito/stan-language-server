// Pure functions provider - returns StanFunction[] using existing types
import type { StanFunction, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

export const provideFunctionCompletions = (
  text: string,
  position: Position,
  functionSignatures: string[],
): StanFunction[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  // Extract function names from signatures
  const functionNames = functionSignatures
    .map((line) => line.split("(", 1)[0]?.trim() ?? "")
    .filter((name) => name !== "");

  // Add additional built-in statements
  const additionalStatements = ["print", "reject", "fatal_error", "target"];
  const allFunctionNames = [...new Set([...functionNames, ...additionalStatements])];

  const functionItems: StanFunction[] = allFunctionNames.map((name) => ({ name }));
  
  const searchableFunctions = getSearchableItems(functionItems, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const functionName = match[1] || "";
    const completionProposals = searchableFunctions.search(functionName);
    return completionProposals;
  }
  
  return [];
};