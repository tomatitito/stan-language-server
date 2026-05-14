import { prepareRename } from "./prepare";
import type { RenameOccurrence, SourcePosition } from "./types";

export function provideRename(
  documentText: string,
  position: SourcePosition,
): RenameOccurrence[] {
  console.error("rename triggered", position);

  const target = prepareRename(documentText, position);
  if (target === null) {
    return [];
  }

  return [];
}
