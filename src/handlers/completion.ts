import {
  type CompletionParams,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver";
import { TextDocument, type Position } from "vscode-languageserver-textdocument";

import TrieSearch from "trie-search";

import { CONSTRAINTS } from "./completion/constraints";
import { DATATYPES } from "./completion/datatypes";
import { KEYWORDS } from "./completion/keywords";
import { SNIPPETS } from "./completion/snippets";
import { DISTRIBUTIONS } from "./completion/distributions";
import { FUNCTIONS } from "./completion/functions";

const addTextEdit = (item: CompletionItem, position: Position, prefix_length: number) => {
  let start = { line: position.line, character: position.character - prefix_length };
  let end = position;
  let textEdit = { range: { start, end }, newText: item.insertText || item.label };
  return { ...item, textEdit };
};

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
  position: Position,
  textUpToCursor: string,
  supportsSnippets: boolean,
): CompletionItem[] => {
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const word = match[1] || "";
    const completionProposals = COMPLETION_TRIE.search(word);
    if (!supportsSnippets) {
      // Filter out snippets if client does not support them
      return completionProposals.filter((item) => item.kind !== CompletionItemKind.Snippet);
    }
    return completionProposals.map((item) => addTextEdit(item, position, word.length));
  }
  return [];
};

// Distributions use a different word matching strategy, so we maintain a separate trie
const DISTRIBUTION_TRIE: TrieSearch<CompletionItem> = new TrieSearch("label", {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});

DISTRIBUTION_TRIE.addAll(DISTRIBUTIONS);

const searchDistributions = (position: Position, textUpToCursor: string): CompletionItem[] => {
  const match = textUpToCursor.match(/.*~\s*([\w_]*)$/);
  if (match) {
    const distName = match[1] || "";
    let completionProposals;
    if (distName === "") {
      completionProposals = DISTRIBUTIONS;
    } else {
      completionProposals = DISTRIBUTION_TRIE.search(distName);
    }
    return completionProposals.map((item) => addTextEdit(item, position, distName.length));
  }
  return [];
};

export const getTextUpToCursor = (text: string, position: Position): string => {
  const lines = text.split("\n");
  const currentLine = lines[position.line] || "";
  return currentLine.substring(0, position.character);
};

export function handleCompletion(
  { position, textDocument }: CompletionParams,
  documents: TextDocuments<TextDocument>,
  supportsSnippets: boolean,
): CompletionItem[] {
  const document = documents.get(textDocument.uri);
  if (!document || !document.languageId.startsWith("stan")) {
    return [];
  }

  const textUpToCursor = getTextUpToCursor(document.getText(), position);

  return [
    ...searchDistributions(position, textUpToCursor),
    ...searchWords(position, textUpToCursor, supportsSnippets),
  ];
}
