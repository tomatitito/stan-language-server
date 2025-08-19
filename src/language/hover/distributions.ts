import type { Hover } from "vscode-languageserver";
import { getMathDistributions } from "../../stanc/compiler";
import { getFunctionDocumentation } from "./functions";
import type {
  TextDocument,
  Position,
} from "vscode-languageserver-textdocument";

const distributionToFunctionMap: Map<string, string> = new Map();

export const setupDistributionMap = () => {
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
};

export const tryDistributionHover = (
  document: TextDocument,
  endOfWord: number
): Hover | null => {
  const text = document.getText();

  // try to find distribution before
  const dist = text
    .substring(0, endOfWord)
    .trimEnd()
    .match(/~\s*(\w+)$/d);
  if (dist && dist[1]) {
    const functionName = distributionToFunctionMap.get(dist[1]);
    if (functionName) {
      const contents = getFunctionDocumentation(functionName);
      if (!contents) {
        return null;
      }

      let range = undefined;
      if (dist.index !== undefined) {
        range = {
          start: document.positionAt(dist.index),
          end: document.positionAt(dist.index + dist[0].length),
        };
      }

      return {
        contents,
        range,
      };
    }
  }

  return null;
};
