import { Language, Parser, type Tree } from "web-tree-sitter";
import {
  STAN_GRAMMAR_WASM,
  TREE_SITTER_WASM,
} from "./wasm-data.generated.ts";

const decodeBase64 = (value: string): Uint8Array => {
  // Prefer Node/Bun's Buffer when available (faster and avoids a copy).
  // Fall back to atob for browser-like environments such as vscode.dev /
  // github.dev, where Buffer is not defined.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64");
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const initParser = async (): Promise<Parser> => {
  await Parser.init({ wasmBinary: decodeBase64(TREE_SITTER_WASM) });
  const language = await Language.load(decodeBase64(STAN_GRAMMAR_WASM));
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
};

let parserPromise: Promise<Parser> | null = null;

export const parse = async (text: string, oldTree?: Tree): Promise<Tree> => {
  if (parserPromise === null) {
    // Cache the pending initialization promise so concurrent callers share it.
    parserPromise = initParser();
    // Reset on failure so the next call retries initialization.
    parserPromise.catch(() => {
      parserPromise = null;
    });
  }

  const parser = await parserPromise;
  const tree = parser.parse(text, oldTree);

  if (tree === null) {
    throw new Error("Tree-sitter failed to produce a parse tree");
  }

  return tree;
};
