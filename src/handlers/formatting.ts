import type {
  DocumentFormattingParams,
  RemoteConsole,
  TextDocuments,
  TextEdit,
  WorkspaceFolder,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { handleCompilation, type Settings } from "./compilation/compilation";
import type { FileSystemReader } from "../types";

export async function handleFormatting(
  params: DocumentFormattingParams,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: FileSystemReader
): Promise<TextEdit[] | { errors: string[] }> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }
  const result = await handleCompilation(
    document,
    documents,
    workspaceFolders,
    settings,
    logger,
    reader
  );

  if (result.errors && result.errors.length > 0) {
    return { errors: result.errors };
  } else if (result.result) {
    const range = {
      start: { line: 0, character: 0 },
      end: {
        line: document.lineCount - 1,
        character: document.getText().length,
      },
    };

    return [
      {
        range,
        newText: result.result,
      },
    ];
  }

  return [];
}
