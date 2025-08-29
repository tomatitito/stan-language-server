import type { HoverParams, Hover, MarkupContent } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  isWordChar,
  previousWordBoundary,
  wordUntilNextParenthesis,
} from "../language/hover/util";
import { getMathSignatures } from "../stanc/compiler";
import { provideHover } from "../language/hover";

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

const initializeFunctionMarkupMap = (): Map<string, MarkupContent> => {
  const markupLookupMap = new Map();

  const mathSignatures = getMathSignatures();
  const lines = mathSignatures.split("\n");
  for (const line of lines) {
    const [name] = line.split("(", 1);
    if (!name) {
      continue;
    }
    if (markupLookupMap.has(name)) {
      appendCodeblock(markupLookupMap.get(name), line);
    } else {
      const doc = getDocumentationForFunction(name);
      doc.value += "\n\n**Available signatures**:";
      appendCodeblock(doc, line);

      markupLookupMap.set(name, doc);
    }
  }
  // not technically 'functions', but still useful
  markupLookupMap.set("print", getDocumentationForFunction("print"));
  markupLookupMap.set("reject", getDocumentationForFunction("reject"));
  markupLookupMap.set(
    "fatal_error",
    getDocumentationForFunction("fatal_error"),
  );
  markupLookupMap.set("target", getDocumentationForFunction("target"));

  return markupLookupMap;
};

function markupContentToHover(
  content: MarkupContent,
  document: TextDocument,
  beginningOfWord: number,
  endOfWord: number,
): Hover {
  return {
    contents: content,
    range: {
      start: document.positionAt(beginningOfWord),
      end: document.positionAt(endOfWord),
    },
  };
}

type MarkupLookupMap = Map<string, MarkupContent>;

type GetMarkupLookupMapFn = () => MarkupLookupMap;

export const handleHover =
  (getMarkupLookupFn: GetMarkupLookupMapFn) =>
  async (
    document: TextDocument,
    params: HoverParams,
  ): Promise<Hover | null> => {
    const functionMarkupLookup = getMarkupLookupFn();
    const currentLine = document
      .getText({
        start: { line: params.position.line, character: 0 },
        end: { line: params.position.line + 1, character: 0 },
      })
      .trim();

    if (!currentLine || !currentLine.includes("(")) {
      return null; // Not a function call
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);

    if (!isWordChar(text[offset]!)) {
      return null;
    }

    const nextParen = wordUntilNextParenthesis(text, offset);
    if (nextParen === -1) {
      return null;
    }
    const beginningOfWord = previousWordBoundary(text, offset);
    
    const hoverName = provideHover(text, beginningOfWord, nextParen);
    if (hoverName) {
      const hoverContent = functionMarkupLookup.get(hoverName);
      if (hoverContent !== undefined) {
        return markupContentToHover(
          hoverContent,
          document,
          beginningOfWord,
          nextParen,
        );
      }
    }

    return null;
  };

export default handleHover(initializeFunctionMarkupMap);
