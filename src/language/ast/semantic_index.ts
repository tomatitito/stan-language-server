import type { Node } from "web-tree-sitter";
import { isHigherOrderStanFunction } from "../stan-symbols";
import type {
  NameInfo,
  SemanticIndex,
  SemanticIndexEntry,
  ReferenceId,
  ReferenceInfo,
  SourcePosition,
  SymbolId,
  SymbolInfo,
  SymbolKind,
} from "./types";


const SCOPE_BOUNDARY_TYPES = new Set([
  "function_definition",
  "block_statement",
  "for_statement",
  "while_statement",
  "if_statement",
  "profile_statement",
  "model",
  "transformed_data",
  "transformed_parameters",
  "generated_quantities",
]);

type Scope = {
  parent: Scope | null;
  declarations: Map<string, SymbolId[]>;
};

type WalkState = {
  scope: Scope;
  nextSymbolId: number;
  nextReferenceId: number;
  symbolsById: Map<SymbolId, SymbolInfo>;
  referencesById: Map<ReferenceId, ReferenceInfo>;
  referenceIdsBySymbolId: Map<SymbolId, ReferenceId[]>;
  nameInfoByNodeId: Map<number, NameInfo>;
};

const utf8ByteLength = (value: string): number => {
  const encoder = new TextEncoder();
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(value, "utf8");
  }
  return encoder.encode(value).byteLength;
};

const byteColumnToSourceCharacter = (
  lineText: string,
  byteColumn: number,
): number => {
  let byteOffset = 0;
  let character = 0;

  while (character < lineText.length) {
    if (byteOffset >= byteColumn) {
      return character;
    }

    const codePoint = lineText.codePointAt(character);
    if (codePoint === undefined) {
      break;
    }

    const symbol = String.fromCodePoint(codePoint);
    byteOffset += utf8ByteLength(symbol);
    character += symbol.length;
  }

  return character;
};

const pointToSourcePosition = (
  lines: string[],
  point: { row: number; column: number },
): SourcePosition => ({
  line: point.row,
  character: byteColumnToSourceCharacter(lines[point.row] ?? "", point.column),
});

export const sourcePositionToTreeSitterPoint = (
  source: string,
  position: SourcePosition,
): { row: number; column: number } => {
  const lines = source.split("\n");
  const lineText = lines[position.line] ?? "";
  const prefix = lineText.slice(0, position.character);

  return {
    row: position.line,
    column: utf8ByteLength(prefix),
  };
};

export const nodeToRange = (lines: string[], node: Node) => ({
  start: pointToSourcePosition(lines, node.startPosition),
  end: pointToSourcePosition(lines, node.endPosition),
});

const createScope = (parent: Scope | null): Scope => ({
  parent,
  declarations: new Map(),
});

const resolveSymbol = (
  scope: Scope,
  name: string,
  kind: SymbolKind,
  symbolsById: Map<SymbolId, SymbolInfo>,
): SymbolId | undefined => {
  for (
    let current: Scope | null = scope;
    current !== null;
    current = current.parent
  ) {
    const symbolIds = current.declarations.get(name) ?? [];
    for (let index = symbolIds.length - 1; index >= 0; index -= 1) {
      const symbolId = symbolIds[index];
      if (symbolId !== undefined && symbolsById.get(symbolId)?.kind === kind) {
        return symbolId;
      }
    }
  }

  return undefined;
};

const isDeclarationIdentifier = (node: Node): boolean => {
  if (node.type !== "identifier") {
    return false;
  }

  const parent = node.parent;
  if (!parent) {
    return false;
  }

  return (
    (parent.type === "parameter_declaration" &&
      parent.childForFieldName("parameter")?.id === node.id) ||
    (parent.type === "for_statement" &&
      parent.childForFieldName("loopvar")?.id === node.id) ||
    (parent.type === "var_decl" &&
      parent.childForFieldName("name")?.id === node.id) ||
    (parent.type === "top_var_decl" &&
      parent.childForFieldName("name")?.id === node.id) ||
    (parent.type === "top_var_decl_no_assign" &&
      parent.childForFieldName("name")?.id === node.id) ||
    (parent.type === "function_declarator" &&
      parent.childForFieldName("name")?.id === node.id)
  );
};

const isReferenceIdentifier = (node: Node): boolean => {
  if (node.type !== "identifier") {
    return false;
  }

  const parent = node.parent;
  if (!parent) {
    return false;
  }

  return (
    (parent.type === "variable_expression" &&
      parent.firstNamedChild?.id === node.id) ||
    (parent.type === "function_expression" &&
      parent.childForFieldName("name")?.id === node.id) ||
    (parent.type === "function_statement" &&
      parent.childForFieldName("name")?.id === node.id)
  );
};

const declarationScopeForNode = (node: Node, currentScope: Scope): Scope => {
  if (node.parent?.type === "function_declarator") {
    return currentScope.parent ?? currentScope;
  }
  return currentScope;
};

const declarationKindForNode = (node: Node): SymbolKind => {
  if (node.parent?.type === "function_declarator") {
    return "function";
  }
  return "value";
};

const isFirstArgumentOfHigherOrderStanFunction = (node: Node): boolean => {
  const expression = node.parent;
  const argumentList = expression?.parent;
  const functionExpression = argumentList?.parent;

  return (
    expression?.type === "variable_expression" &&
    argumentList?.type === "argument_list" &&
    functionExpression?.type === "function_expression" &&
    isHigherOrderStanFunction(
      functionExpression.childForFieldName("name")?.text ?? "",
    ) &&
    argumentList.namedChildren[0]?.id === expression.id
  );
};

const referenceKindForNode = (node: Node): SymbolKind => {
  if (
    node.parent?.type === "function_expression" ||
    node.parent?.type === "function_statement" ||
    isFirstArgumentOfHigherOrderStanFunction(node)
  ) {
    return "function";
  }
  return "value";
};

export const buildSemanticIndex = (
  source: string,
  tree: SemanticIndexEntry["tree"],
): SemanticIndex => {
  const lines = source.split("\n");
  const nameInfoByNodeId = new Map<number, NameInfo>();
  const symbolsById = new Map<SymbolId, SymbolInfo>();
  const referencesById = new Map<ReferenceId, ReferenceInfo>();
  const referenceIdsBySymbolId = new Map<SymbolId, ReferenceId[]>();

  if (!("rootNode" in tree) || !tree.rootNode) {
    return {
      nameInfoByNodeId,
      symbolsById,
      referencesById,
      referenceIdsBySymbolId,
    };
  }

  function walk(node: Node, state: WalkState): WalkState {
    const enteredNewScope =
      node !== tree.rootNode && SCOPE_BOUNDARY_TYPES.has(node.type);
    const currentScope = enteredNewScope
      ? createScope(state.scope)
      : state.scope;
    let nextState: WalkState = {
      ...state,
      scope: currentScope,
    };

    if (isDeclarationIdentifier(node)) {
      const symbolId: SymbolId = `symbol-${nextState.nextSymbolId}`;
      const targetScope = declarationScopeForNode(node, currentScope);
      nextState.symbolsById.set(symbolId, {
        id: symbolId,
        name: node.text,
        kind: declarationKindForNode(node),
        range: nodeToRange(lines, node),
        nodeId: node.id,
      });
      nextState.nameInfoByNodeId.set(node.id, {
        kind: "declaration",
        symbolId,
        renameable: true,
      });
      const declarations = targetScope.declarations.get(node.text) ?? [];
      targetScope.declarations.set(node.text, [...declarations, symbolId]);
      nextState = {
        ...nextState,
        nextSymbolId: nextState.nextSymbolId + 1,
      };
    } else if (isReferenceIdentifier(node)) {
      const symbolId = resolveSymbol(
        currentScope,
        node.text,
        referenceKindForNode(node),
        nextState.symbolsById,
      );
      if (symbolId === undefined) {
        nextState.nameInfoByNodeId.set(node.id, {
          kind: "reference",
          renameable: false,
        });
      } else {
        const refId: ReferenceId = `reference-${nextState.nextReferenceId}`;
        nextState.referencesById.set(refId, {
          id: refId,
          symbolId,
          range: nodeToRange(lines, node),
          nodeId: node.id,
        });
        const referenceIds = nextState.referenceIdsBySymbolId.get(symbolId) ?? [];
        nextState.referenceIdsBySymbolId.set(symbolId, [...referenceIds, refId]);
        nextState.nameInfoByNodeId.set(node.id, {
          kind: "reference",
          refId,
          renameable: true,
        });
        nextState = {
          ...nextState,
          nextReferenceId: nextState.nextReferenceId + 1,
        };
      }
    }

    for (const child of node.namedChildren) {
      const childState = walk(child, nextState);
      nextState = {
        ...childState,
        scope: currentScope,
      };
    }

    return {
      ...nextState,
      scope: enteredNewScope ? state.scope : currentScope,
    };
  }

  const finalState = walk(tree.rootNode, {
    scope: createScope(null),
    nextSymbolId: 1,
    nextReferenceId: 1,
    symbolsById,
    referencesById,
    referenceIdsBySymbolId,
    nameInfoByNodeId,
  });

  return {
    nameInfoByNodeId: finalState.nameInfoByNodeId,
    symbolsById: finalState.symbolsById,
    referencesById: finalState.referencesById,
    referenceIdsBySymbolId: finalState.referenceIdsBySymbolId,
  };
};
