import type { Hover, MarkupContent } from "vscode-languageserver";
import { getMathSignatures } from "../../stanc/compiler";
import type { TextDocument } from "vscode-languageserver-textdocument";

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
  beginningOfWord: number,
  endOfWord: number
): Hover | null => {
  const text = document.getText();

  const funcName = text.substring(beginningOfWord, endOfWord).trim();
  const contents = getFunctionDocumentation(funcName);
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
