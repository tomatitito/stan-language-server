import type { Node } from "web-tree-sitter";
import type { SemanticIndexEntry, SourcePosition, SymbolId } from "./types";
import { nodeToRange, sourcePositionToTreeSitterPoint } from "./semantic_index";

const comparePositions = (
  left: SourcePosition,
  right: SourcePosition,
): number => {
  if (left.line !== right.line) {
    return left.line - right.line;
  }
  return left.character - right.character;
};

const normalizeToIdentifierNode = (node: Node | null): Node | null => {
  if (node === null) {
    return null;
  }
  if (node.type === "identifier") {
    return node;
  }

  for (const child of node.namedChildren) {
    if (child.type === "identifier") {
      return child;
    }
  }

  return null;
};

export const symbolAtPosition = (
  index: Pick<SemanticIndexEntry, "tree" | "semanticIndex">,
  source: string,
  position: SourcePosition,
):
  | { symbolId: SymbolId; range: ReturnType<typeof nodeToRange> }
  | undefined => {
  if (!("rootNode" in index.tree) || !index.tree.rootNode) {
    return undefined;
  }

  const point = sourcePositionToTreeSitterPoint(source, position);
  const node = normalizeToIdentifierNode(
    index.tree.rootNode.namedDescendantForPosition(point),
  );
  if (node === null) {
    return undefined;
  }

  const range = nodeToRange(source.split("\n"), node);
  if (
    comparePositions(position, range.start) < 0 ||
    comparePositions(position, range.end) >= 0
  ) {
    return undefined;
  }

  const nameInfo = index.semanticIndex.nameInfoByNodeId.get(node.id);
  if (!nameInfo?.renameable) {
    return undefined;
  }

  switch (nameInfo.kind) {
    case "declaration":
      return { symbolId: nameInfo.symbolId, range };

    case "reference": {
      if (nameInfo.refId === undefined) {
        return undefined;
      }

      const reference = index.semanticIndex.referencesById.get(nameInfo.refId);
      if (reference === undefined) {
        return undefined;
      }

      return { symbolId: reference.symbolId, range };
    }

    default:
      return undefined;
  }
};
