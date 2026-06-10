import { prepareRename } from "./prepare";
import type { SemanticIndexEntry, SourcePosition } from "../ast/types";
import type { RenameOccurrence } from "./types";

export function provideRename(
  entry: SemanticIndexEntry,
  position: SourcePosition,
): RenameOccurrence[] {
  const target = prepareRename(entry, position);
  if (target === null) {
    return [];
  }

  const symbol = entry.semanticIndex.symbolsById.get(target.symbolId);
  if (symbol === undefined) {
    return [];
  }

  const referenceIds =
    entry.semanticIndex.referenceIdsBySymbolId.get(target.symbolId) ?? [];

  return [
    { range: symbol.range },
    ...referenceIds.flatMap((referenceId) => {
      const reference = entry.semanticIndex.referencesById.get(referenceId);
      return reference === undefined ? [] : [{ range: reference.range }];
    }),
  ];
}
