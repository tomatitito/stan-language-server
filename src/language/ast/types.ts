import type { Tree } from "web-tree-sitter";

export type SourcePosition = { line: number; character: number };

export type SourceRange = {
  start: SourcePosition;
  end: SourcePosition;
};

export type SymbolId = string;

export type SymbolInfo = {
  id: SymbolId;
  name: string;
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
      symbolId?: SymbolId;
      renameable: boolean;
    };

export type SemanticIndex = {
  lines: string[];
  nameInfoByNodeId: Map<number, NameInfo>;
  symbolsById: Map<SymbolId, SymbolInfo>;
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
