import type { RenameTarget, SourcePosition } from "./types";

const IDENTIFIER_PATTERN = /[A-Za-z_][A-Za-z0-9_]*/g;

const getLineText = (documentText: string, line: number): string | null => {
  const lines = documentText.split("\n");
  return lines[line] ?? null;
};

export function prepareRename(
  documentText: string,
  position: SourcePosition,
): RenameTarget | null {
  console.error("prepare rename triggered", position);

  const lineText = getLineText(documentText, position.line);
  if (lineText === null) {
    return null;
  }

  for (const match of lineText.matchAll(IDENTIFIER_PATTERN)) {
    const start = match.index;
    const name = match[0];

    if (start === undefined || name === undefined) {
      continue;
    }

    const end = start + name.length;
    if (position.character < start || position.character > end) {
      continue;
    }

    return {
      name,
      range: {
        start: { line: position.line, character: start },
        end: { line: position.line, character: end },
      },
    };
  }

  return null;
}
