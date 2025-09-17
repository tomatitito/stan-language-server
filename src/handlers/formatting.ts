import type {
  DocumentFormattingParams,
  RemoteConsole,
  TextDocuments,
  TextEdit,
  WorkspaceFolder,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { handleCompilation } from "./compilation/compilation";

export async function handleFormatting(
  params: DocumentFormattingParams,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  logger: RemoteConsole
): Promise<TextEdit[] | { errors: string[] }> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }
  const result = await handleCompilation(
    document,
    documents,
    workspaceFolders,
    logger
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
