import TrieSearch, { type TrieSearchOptions } from "trie-search";
import type { Searchable } from "../../types/completion";

export const getSearchableItems = <T extends Searchable>(
  xs: T[],
  options: TrieSearchOptions<T> = {},
): TrieSearch<T> => {
  let searchableItem: TrieSearch<T> = new TrieSearch("name", options);
  searchableItem.addAll(xs);
  return searchableItem;
};
