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
  position: Position
): Hover | undefined => {
  const text = document.getText();

  let offset = document.offsetAt(position) + 1; // include the character at the cursor position

  const next_break = text.substring(offset).search(/[\s;\(\),\[\]]/);
  if (next_break !== -1) offset += next_break;

  // try to find distribution before
  const dist = text.substring(0, offset).match(/~\s*([\w_]+)$/);
  if (dist && dist[1]) {
    const functionName = distributionToFunctionMap.get(dist[1]);
    if (functionName) {
      const contents = getFunctionDocumentation(functionName);
      if (!contents) {
        return undefined;
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
  return undefined;
};
