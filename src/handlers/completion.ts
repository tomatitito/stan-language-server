import {
  type CompletionParams,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { Position } from "../types";

import TrieSearch from "trie-search";

import { CONSTRAINTS } from "./completion/constraints";
import { DATATYPES } from "./completion/datatypes";
import { KEYWORDS } from "./completion/keywords";
import { SNIPPETS } from "./completion/snippets";
import { DISTRIBUTIONS } from "./completion/distributions";
import { FUNCTIONS } from "./completion/functions";

// Build one trie for general word-boundary completions.
const COMPLETION_TRIE: TrieSearch<CompletionItem> = new TrieSearch("label", {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});

COMPLETION_TRIE.addAll([
  ...CONSTRAINTS,
  ...DATATYPES,
  ...KEYWORDS,
  ...FUNCTIONS,
  ...SNIPPETS,
]);

const searchWords = (
  textUpToCursor: string,
  supportsSnippets: boolean,
): CompletionItem[] => {
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const word = match[1] || "";
    const completionProposals = COMPLETION_TRIE.search(word);
    if (!supportsSnippets) {
      // Filter out snippets if client does not support them
      return completionProposals.filter(
        (item) => item.kind !== CompletionItemKind.Snippet,
      );
    }
    return completionProposals;
  }
  return [];
};

// Distributions use a different word matching strategy, so we maintain a separate trie
const DISTRIBUTION_TRIE: TrieSearch<CompletionItem> = new TrieSearch("label", {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});

DISTRIBUTION_TRIE.addAll(DISTRIBUTIONS);

const searchDistributions = (textUpToCursor: string): CompletionItem[] => {
  const match = textUpToCursor.match(/.*~\s*([\w_]*)$/);
  if (match) {
    const distName = match[1] || "";
    let completionProposals;
    if (distName === "") {
      completionProposals = DISTRIBUTIONS;
    } else {
      completionProposals = DISTRIBUTION_TRIE.search(distName);
    }
    return completionProposals;
  }
  return [];
};

export const getTextUpToCursor = (text: string, position: Position): string => {
  const lines = text.split("\n");
  const currentLine = lines[position.line] || "";
  return currentLine.substring(0, position.character);
};

export function handleCompletion(
  params: CompletionParams,
  documents: TextDocuments<TextDocument>,
  supportsSnippets: boolean,
): CompletionItem[] {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const textUpToCursor = getTextUpToCursor(document.getText(), params.position);

  return [
    ...searchDistributions(textUpToCursor),
    ...searchWords(textUpToCursor, supportsSnippets),
  ];
}
