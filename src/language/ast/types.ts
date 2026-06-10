import type { Tree } from "web-tree-sitter";

export type SourcePosition = { line: number; character: number };

export type SourceRange = {
  start: SourcePosition;
  end: SourcePosition;
};

export type SymbolId = string;
export type ReferenceId = string;

export type SymbolKind = "function" | "value";

export type SymbolInfo = {
  id: SymbolId;
  name: string;
  kind: SymbolKind;
  range: SourceRange;
  nodeId: number;
};

export type ReferenceInfo = {
  id: ReferenceId;
  symbolId: SymbolId;
  range: SourceRange;
  nodeId: number;
};

export type NameInfo =
  | {
      kind: "declaration";
      symbolId: SymbolId;
      renameable: boolean;
    }
  | {
      kind: "reference";
      refId?: ReferenceId;
      renameable: boolean;
    };

export type SemanticIndex = {
  nameInfoByNodeId: Map<number, NameInfo>;
  symbolsById: Map<SymbolId, SymbolInfo>;
  referencesById: Map<ReferenceId, ReferenceInfo>;
  referenceIdsBySymbolId: Map<SymbolId, ReferenceId[]>;
};

export type SemanticIndexEntry = {
  uri: string;
  version: number;
  text: string;
  tree: Tree;
  semanticIndex: SemanticIndex;
};

export type WorkspaceIndex = {
  entries: Map<string, SemanticIndexEntry>;
};
