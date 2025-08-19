import type { Hover, MarkupContent } from "vscode-languageserver";
import { getMathSignatures } from "../../stanc/compiler";
import type {
  TextDocument,
  Position,
} from "vscode-languageserver-textdocument";

const functionSignatureMap: Map<string, MarkupContent> = new Map();

const getDocumentationForFunction = (name: string): MarkupContent => {
  return {
    kind: "markdown",
    value: `[Jump to Stan Functions Reference index entry for ${name}](https://mc-stan.org/docs/functions-reference/functions_index.html#${name})`,
  };
};

const appendCodeblock = (content: MarkupContent | undefined, code: string) => {
  if (!content) {
    return;
  }
  content.value += "\n```stan\n";
  content.value += code;
  content.value += "\n```";
};

export function setupSignatureMap() {
  const mathSignatures = getMathSignatures();
  const lines = mathSignatures.split("\n");
  for (const line of lines) {
    const [name] = line.split("(", 1);
    if (!name) {
      continue;
    }
    if (functionSignatureMap.has(name)) {
      appendCodeblock(functionSignatureMap.get(name), line);
    } else {
      const doc = getDocumentationForFunction(name);
      doc.value += "\n\n**Available signatures**:";
      appendCodeblock(doc, line);

      functionSignatureMap.set(name, doc);
    }
  }
  // not technically 'functions', but still useful
  functionSignatureMap.set("print", getDocumentationForFunction("print"));
  functionSignatureMap.set("reject", getDocumentationForFunction("reject"));
  functionSignatureMap.set(
    "fatal_error",
    getDocumentationForFunction("fatal_error")
  );
  functionSignatureMap.set("target", getDocumentationForFunction("target"));
}

export const getFunctionDocumentation = (
  name: string
): MarkupContent | undefined => {
  return functionSignatureMap.get(name);
};

export const tryFunctionHover = (
  document: TextDocument,
  position: Position
): Hover | undefined => {
  const text = document.getText();

  let offset = document.offsetAt(position) + 1; // include the character at the cursor position

  const next_paren = text.indexOf("(", offset);
  if (next_paren !== -1) {
    const func = text.substring(0, next_paren + 1).match(/[\w_]+\s*\($/);
    if (func) {
      const funcName = func[0].replace("(", "").trim();
      const contents = getFunctionDocumentation(funcName);
      if (!contents) {
        return undefined;
      }

      let range = undefined;
      if (func.index !== undefined) {
        range = {
          start: document.positionAt(func.index),
          end: document.positionAt(func.index + funcName.length),
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
