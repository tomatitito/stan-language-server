import { symbolAtPosition } from "../ast/symbol";
import type {
  SemanticIndexEntry,
  SourcePosition,
  SourceRange,
} from "../ast/types";

export function provideDefinition(
  entry: SemanticIndexEntry,
  position: SourcePosition,
): SourceRange | null {
  const target = symbolAtPosition(entry, position);
  if (target === undefined) {
    return null;
  }

  return entry.semanticIndex.symbolsById.get(target.symbolId)?.range ?? null;
}
