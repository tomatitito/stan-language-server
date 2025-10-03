import type { HoverParams, Hover, MarkupContent } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { dump_stan_math_signatures } from "stanc3";
import {
  isWordChar,
  previousWordBoundary,
  wordUntilNextParenthesis,
} from "../language/hover/util";
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

// These are either not technically functions, like print, or
// have signatures too complex to be output by stanc3
export const manual_functions = [
  "print",
  "reject",
  "fatal_error",
  "target",
  "dae",
  "dae_tol",
  "ode_adams",
  "ode_adams_tol",
  "ode_adjoint_tol_ctl",
  "ode_bdf",
  "ode_bdf_tol",
  "ode_ckrk",
  "ode_ckrk_tol",
  "ode_rk45",
  "ode_rk45_tol",
  "solve_newton",
  "solve_newton_tol",
  "solve_powell",
  "solve_powell_tol",
  "reduce_sum",
  "reduce_sum_static",
];

const initializeFunctionMarkupMap = (): Map<string, MarkupContent> => {
  const markupLookupMap = new Map();

  const mathSignatures = dump_stan_math_signatures();
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

  for (const func of manual_functions) {
    markupLookupMap.set(func, getDocumentationForFunction(func));
  }

  return markupLookupMap;
};

const FUNCTION_MARKUP_LOOKUP = initializeFunctionMarkupMap();

function markupContentToHover(
  content: MarkupContent,
  document: TextDocument,
  beginningOfWord: number,
  endOfWord: number
): Hover {
  return {
    contents: content,
    range: {
      start: document.positionAt(beginningOfWord),
      end: document.positionAt(endOfWord),
    },
  };
}

async function handleHover(
  document: TextDocument,
  params: HoverParams
): Promise<Hover | null> {
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
    const hoverContent = FUNCTION_MARKUP_LOOKUP.get(hoverName);
    if (hoverContent !== undefined) {
      return markupContentToHover(
        hoverContent,
        document,
        beginningOfWord,
        nextParen
      );
    }
  }

  return null;
}

export default handleHover;
