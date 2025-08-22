import TrieSearch, { type TrieSearchOptions } from "trie-search";
import type { Searchable, Position } from "../../types/completion";

export const getSearchableItems = <T extends Searchable>(
  xs: T[],
  options: TrieSearchOptions<T> = {},
): TrieSearch<T> => {
  let searchableItem: TrieSearch<T> = new TrieSearch("name", options);
  searchableItem.addAll(xs);
  return searchableItem;
};

export const getTextUpToCursor = (text: string, position: Position): string => {
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  return currentLine.substring(0, position.character);
};
