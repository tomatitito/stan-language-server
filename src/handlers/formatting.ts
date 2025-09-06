import { fileURLToPath } from "bun";
import type {
    DocumentFormattingParams,
    TextDocuments,
    TextEdit,
    WorkspaceFolder,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { provideFormatting } from "../language/formatting";
import type { FormattingContext, FormattingOptions } from "../types/formatting";
import { handleIncludes } from "./compilation/includes";

export async function handleFormatting(
  params: DocumentFormattingParams,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  options: FormattingOptions = {},
): Promise<TextEdit[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const filename = fileURLToPath(document.uri);
  const content = document.getText();

  const includes = await handleIncludes(document, documents, workspaceFolders);

  const context: FormattingContext = {
    filename,
    content,
    includes,
  };

  const result = provideFormatting(context, options);

  // Convert result to LSP TextEdit
  if (result.success && result.formattedCode) {
    // Stan compiler formats entire documents
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
        newText: result.formattedCode,
      },
    ];
  }

  // Return empty array if formatting failed
  // (errors are handled by the caller if needed)
  return [];
}

export async function getFormattingErrors(
  params: DocumentFormattingParams,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  options: FormattingOptions = {},
): Promise<string[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const filename = fileURLToPath(document.uri);
  const content = document.getText();
  const includes = await handleIncludes(document, documents, workspaceFolders);

  const context: FormattingContext = {
    filename,
    content,
    includes,
  };

  const result = provideFormatting(context, options);
  return result.errors || [];
}
