import type {
  DocumentFormattingParams,
  RemoteConsole,
  TextEdit,
  WorkspaceFolder,
} from "vscode-languageserver";
import { handleCompilation, type Settings } from "./compilation/compilation";
import type { TextDocumentProvider, WorkspaceFileReader } from "../types";

export async function handleFormatting(
  params: DocumentFormattingParams,
  documents: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  settings: Settings,
  logger: RemoteConsole,
  reader?: WorkspaceFileReader,
): Promise<TextEdit[] | { errors: string[] }> {
  const document = documents.get(params.textDocument.uri);
  if (!document || !document.languageId.startsWith("stan")) {
    return [];
  }
  const result = await handleCompilation(
    document,
    documents,
    workspaceFolders,
    settings,
    "formatting",
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
