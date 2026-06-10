import { symbolAtPosition } from "../ast/symbol";
import type { SemanticIndexEntry, SourcePosition } from "../ast/types";
import type { RenameTarget } from "./types";

export function prepareRename(
  entry: SemanticIndexEntry,
  position: SourcePosition,
): RenameTarget | null {
  const symbol = symbolAtPosition(entry, entry.text, position);
  if (symbol === undefined) {
    return null;
  }

  const symbolInfo = entry.semanticIndex.symbolsById.get(symbol.symbolId);
  if (symbolInfo === undefined) {
    return null;
  }

  return {
    symbolId: symbol.symbolId,
    name: symbolInfo.name,
    range: symbol.range,
  };
}
