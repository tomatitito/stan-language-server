import type { Hover } from "vscode-languageserver";
import { getMathDistributions } from "../../stanc/compiler";
import { getFunctionDocumentation } from "./functions";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { isWhitespace } from "./util";

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
  document: TextDocument,
  beginningOfWord: number,
  endOfWord: number
): Hover | null => {
  const text = document.getText();

  if (!tildeBefore(text, beginningOfWord)) return null;

  const dist = text.substring(beginningOfWord, endOfWord).trim();
  const functionName = distributionToFunctionMap.get(dist);
  if (!functionName) return null;

  const contents = getFunctionDocumentation(functionName);
  if (!contents) return null;

  const range = {
    start: document.positionAt(beginningOfWord),
    end: document.positionAt(endOfWord),
  };

  return {
    contents,
    range,
  };
};
