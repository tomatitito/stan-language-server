import type { SourceRange } from "../ast/types";

export type RenameTarget = {
  name: string;
  range: SourceRange;
};

export type RenameOccurrence = {
  range: SourceRange;
};
