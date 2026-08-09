import { TextDocument } from "vscode-languageserver-textdocument";
import { Edit, type Point, type Tree } from "web-tree-sitter";
import type { DocumentChange } from "../../server/document_state";
import type {
  SemanticIndexEntry,
  WorkspaceIndex,
} from "./types";
import { buildSemanticIndex } from "./semantic_index";

export type ParseDocument = (text: string, oldTree?: Tree) => Promise<Tree>;

type EditProperties = ConstructorParameters<typeof Edit>[0];

const textEncoder = new TextEncoder();

const byteLength = (text: string): number => textEncoder.encode(text).byteLength;

const isCodePointBoundary = (text: string, offset: number): boolean => {
  if (offset <= 0 || offset >= text.length) {
    return true;
  }

  const previous = text.charCodeAt(offset - 1);
  const current = text.charCodeAt(offset);
  const splitsSurrogatePair = previous >= 0xd800 && previous <= 0xdbff
    && current >= 0xdc00 && current <= 0xdfff;
  return !splitsSurrogatePair;
};

const exactOffsetAt = (
  document: TextDocument,
  position: { line: number; character: number },
): number | null => {
  const offset = document.offsetAt(position);
  const actualPosition = document.positionAt(offset);
  if (
    actualPosition.line !== position.line
    || actualPosition.character !== position.character
    || !isCodePointBoundary(document.getText(), offset)
  ) {
    return null;
  }
  return offset;
};

const treeSitterPoint = (
  document: TextDocument,
  position: { line: number; character: number },
  offset: number,
): Point | null => {
  const lineStartOffset = exactOffsetAt(document, {
    line: position.line,
    character: 0,
  });
  if (lineStartOffset === null) {
    return null;
  }

  return {
    row: position.line,
    column: byteLength(document.getText().slice(lineStartOffset, offset)),
  };
};

const pointAfterInsertedText = (start: Point, text: string): Point => {
  let row = start.row;
  let lastLineStart = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      row += 1;
      lastLineStart = index + 1;
    }
  }

  return {
    row,
    column: row === start.row
      ? start.column + byteLength(text)
      : byteLength(text.slice(lastLineStart)),
  };
};

const buildIncrementalEdits = (
  previousEntry: SemanticIndexEntry,
  document: TextDocument,
  changes: readonly DocumentChange[],
): EditProperties[] | null => {
  if (changes.length === 0) {
    return null;
  }

  let version = previousEntry.version;
  let text = previousEntry.text;
  const edits: EditProperties[] = [];

  for (const batch of changes) {
    const previousDocument = batch.previousDocument;
    if (
      previousDocument.uri !== document.uri
      || batch.document.uri !== document.uri
      || previousDocument.version !== version
      || batch.document.version <= previousDocument.version
      || previousDocument.getText() !== text
      || batch.contentChanges.length === 0
    ) {
      return null;
    }

    let workingDocument = previousDocument;
    for (const contentChange of batch.contentChanges) {
      if (!("range" in contentChange)) {
        return null;
      }

      const startOffset = exactOffsetAt(workingDocument, contentChange.range.start);
      const endOffset = exactOffsetAt(workingDocument, contentChange.range.end);
      if (
        startOffset === null
        || endOffset === null
        || endOffset < startOffset
        || (
          contentChange.rangeLength !== undefined
          && contentChange.rangeLength !== endOffset - startOffset
        )
      ) {
        return null;
      }

      const startPosition = treeSitterPoint(
        workingDocument,
        contentChange.range.start,
        startOffset,
      );
      const oldEndPosition = treeSitterPoint(
        workingDocument,
        contentChange.range.end,
        endOffset,
      );
      if (startPosition === null || oldEndPosition === null) {
        return null;
      }

      const workingText = workingDocument.getText();
      const startIndex = byteLength(workingText.slice(0, startOffset));
      const oldEndIndex = byteLength(workingText.slice(0, endOffset));
      const insertedByteLength = byteLength(contentChange.text);
      edits.push({
        startIndex,
        oldEndIndex,
        newEndIndex: startIndex + insertedByteLength,
        startPosition,
        oldEndPosition,
        newEndPosition: pointAfterInsertedText(startPosition, contentChange.text),
      });

      text = workingText.slice(0, startOffset)
        + contentChange.text
        + workingText.slice(endOffset);
      workingDocument = TextDocument.create(
        previousDocument.uri,
        previousDocument.languageId,
        previousDocument.version,
        text,
      );
    }

    if (text !== batch.document.getText()) {
      return null;
    }
    version = batch.document.version;
  }

  if (version !== document.version || text !== document.getText()) {
    return null;
  }
  return edits;
};

const prepareOldTree = (
  previousEntry: SemanticIndexEntry | undefined,
  document: TextDocument,
  changes: readonly DocumentChange[],
): Tree | null => {
  if (!previousEntry) {
    return null;
  }

  const edits = buildIncrementalEdits(previousEntry, document, changes);
  if (edits === null) {
    return null;
  }

  try {
    const oldTree = previousEntry.tree.copy();
    for (const edit of edits) {
      oldTree.edit(new Edit(edit));
    }
    return oldTree;
  } catch {
    return null;
  }
};

const parseWithTreeSitter: ParseDocument = async (text, oldTree) => {
  const { parse } = await import("./parser");
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
  changes: readonly DocumentChange[] = [],
  parseDocument: ParseDocument = parseWithTreeSitter,
): Promise<WorkspaceIndex> => {
  const cachedEntry = getSemanticIndexEntry(index, document);
  if (cachedEntry !== null) {
    return index;
  }

  const text = document.getText();
  const oldTree = prepareOldTree(
    index.entries.get(document.uri),
    document,
    changes,
  );
  const tree = oldTree === null
    ? await parseDocument(text)
    : await parseDocument(text, oldTree);
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
