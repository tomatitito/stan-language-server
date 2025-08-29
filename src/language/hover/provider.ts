import { tryDistributionHover } from "./distributions";
import { tryFunctionHover } from "./functions";

export function provideHover(text: string, beginningOfWord: number, endOfWord: number): string | null {
  const distributionHover = tryDistributionHover(text, beginningOfWord, endOfWord);
  if (distributionHover) {
    return distributionHover;
  }
  
  const functionHover = tryFunctionHover(text, beginningOfWord, endOfWord);
  if (functionHover) {
    return functionHover;
  }
  
  return null;
}