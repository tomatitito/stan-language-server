import { prepareRename } from "./prepare";
import type { SemanticIndexEntry, SourcePosition } from "../ast/types";
import type { RenameOccurrence } from "./types";

export function provideRenameFromEntry(
  entry: SemanticIndexEntry,
  position: SourcePosition,
): RenameOccurrence[] {
  const target = prepareRename(entry, position);
  if (target === null) {
    return [];
  }

  return [];
}

export const provideRename = (
  documentText: string,
  position: SourcePosition,
): RenameOccurrence[] => {
  return provideRenameFromEntry(
    {
      uri: "",
      version: 0,
      text: documentText,
      tree: {} as SemanticIndexEntry["tree"],
      semanticIndex: {
        lines: documentText.split("\n"),
        nameInfoByNodeId: new Map(),
        symbolsById: new Map(),
      },
    },
    position,
  );
};
