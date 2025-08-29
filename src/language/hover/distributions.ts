import { getMathDistributions } from "../../stanc/compiler";
import { isWhitespace } from "./util";


const setupDistributionMap = () => {
  const distributionToFunctionMap: Map<string, string> = new Map();
  const mathDistributions = getMathDistributions();
  const distLines = mathDistributions.split("\n");
  for (const line of distLines) {
    const [name, extensions] = line.split(":", 2);
    if (!name || !extensions) {
      continue;
    }
    const extension = extensions.split(",", 1)[0]?.trim();
    distributionToFunctionMap.set(name, `${name}_${extension}`);
  }
  return distributionToFunctionMap
};

const tildeBefore = (text: string, pos: number) => {
  for (let i = pos - 1; i >= 0; i--) {
    const char = text[i]!;
    if (char === "~") {
      return true;
    } else if (isWhitespace(char)) {
      continue;
    } else {
      return false;
    }
  }
  return false;
};

export const tryDistributionHover = (
  text: string,
  beginningOfWord: number,
  endOfWord: number,
): string | null => {
  if (!tildeBefore(text, beginningOfWord)) return null;
  const distributionToFunctionMap = setupDistributionMap();

  const dist = text.substring(beginningOfWord, endOfWord).trim();
  const functionName = distributionToFunctionMap.get(dist);
  if (!functionName) return null;
  return functionName;
};
