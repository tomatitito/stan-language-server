import type {
  DocumentFormattingParams,
  RemoteConsole,
  TextEdit,
  WorkspaceFolder,
} from "vscode-languageserver";
import { formatWithStanc, type Settings } from "./compilation/compilation";
import type { FileSystemReader, TextDocumentProvider } from "../types";

export async function handleFormatting(
  params: DocumentFormattingParams,
  documents: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: FileSystemReader,
): Promise<TextEdit[] | { errors: string[] }> {
  const document = documents.get(params.textDocument.uri);
  if (!document || !document.languageId.startsWith("stan")) {
    return [];
  }
  const result = await formatWithStanc(
    document,
    documents,
    workspaceFolders,
    settings,
    logger,
    reader,
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
