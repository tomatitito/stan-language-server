import type { TextDocument } from "vscode-languageserver-textdocument";
import type { Tree } from "web-tree-sitter";
import type {
  SemanticIndexEntry,
  WorkspaceIndex,
} from "./types";
import { buildSemanticIndex } from "./semantic_index";

export type ParseDocument = (text: string, oldTree?: Tree) => Promise<Tree>;

const parseWithTreeSitter: ParseDocument = async (text, oldTree) => {
  const { parse } = await import("../treesitter/parser");
  return parse(text, oldTree);
};

export const createWorkspaceIndex = (): WorkspaceIndex => ({
  entries: new Map(),
});

export const getSemanticIndexEntry = (
  index: WorkspaceIndex,
  document: Pick<TextDocument, "uri" | "version">,
): SemanticIndexEntry | null => {
  const entry = index.entries.get(document.uri);
  if (!entry || entry.version !== document.version) {
    return null;
  }
  return entry;
};

export const upsertSemanticIndexEntry = async (
  index: WorkspaceIndex,
  document: TextDocument,
  parseDocument: ParseDocument = parseWithTreeSitter,
): Promise<WorkspaceIndex> => {
  const cachedEntry = getSemanticIndexEntry(index, document);
  if (cachedEntry !== null) {
    return index;
  }

  const previousEntry = index.entries.get(document.uri) ?? null;
  const text = document.getText();
  const tree = await parseDocument(text, previousEntry?.tree);
  const entry: SemanticIndexEntry = {
    uri: document.uri,
    version: document.version,
    text,
    tree,
    semanticIndex: buildSemanticIndex(text, tree),
  };

  const entries = new Map([...index.entries, [document.uri, entry]]);
  return { ...index, entries };
};

export const removeSemanticIndexEntry = (
  index: WorkspaceIndex,
  uri: string,
): WorkspaceIndex => {
  if (!index.entries.has(uri)) {
    return index;
  }

  const entries = new Map(index.entries);
  entries.delete(uri);
  return { entries };
};
