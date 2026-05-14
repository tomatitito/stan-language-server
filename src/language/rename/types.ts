export type SourcePosition = { line: number; character: number };

export type SourceRange = {
  start: SourcePosition;
  end: SourcePosition;
};

export type RenameTarget = {
  name: string;
  range: SourceRange;
};

export type RenameOccurrence = {
  range: SourceRange;
};
