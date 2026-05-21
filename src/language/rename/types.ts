import type { SourceRange, SymbolId } from "../ast/types";

export type RenameTarget = {
  symbolId: SymbolId;
  name: string;
  range: SourceRange;
};

export type RenameOccurrence = {
  range: SourceRange;
};
