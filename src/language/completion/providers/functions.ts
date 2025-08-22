// Pure functions provider - returns StanFunction[] using existing types
import type { StanFunction } from "../../../types/completion";
import { getSearchableItems } from "../util";

export interface Position {
  line: number;
  character: number;
}

export const provideFunctionCompletions = (
  text: string,
  position: Position,
  functionSignatures: string[],
): StanFunction[] => {
  // Calculate line start position
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  const textUpToCursor = currentLine.substring(0, position.character);

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