import {
  CodeActionKind,
  StringValue,
  type CodeAction,
  type CodeActionParams,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { provideDocumentationTemplate } from "../language/documentation/provider.ts";
import { getSemanticIndexEntry } from "../language/ast/workspace_index.ts";
import type { WorkspaceIndex } from "../language/ast/types.ts";

export const handleCodeAction = (
  document: TextDocument,
  params: CodeActionParams,
  supportsDocumentChanges: boolean,
  workspaceIndex: WorkspaceIndex,
  supportsSnippetEdits: boolean,
): CodeAction[] => {
  const kind = CodeActionKind.RefactorRewrite;
  if (params.context.only && !params.context.only.some(
    (requested) => requested === "" || kind === requested || kind.startsWith(`${requested}.`),
  )) {
    return [];
  }

  const entry = getSemanticIndexEntry(workspaceIndex, document);
  if (entry === null) {
    return [];
  }
  const template = provideDocumentationTemplate(
    entry,
    document.offsetAt(params.range.start),
    document.offsetAt(params.range.end),
  );
  if (template === null) {
    return [];
  }

  const insertion = document.positionAt(template.offset);
  const edits = [{
    range: { start: insertion, end: insertion },
    newText: template.newText,
  }];
  // Snippet syntax belongs to the LSP response, not the language provider.
  // Escape literal text before adding the final cursor stop after @brief.
  const snippetEdits = supportsDocumentChanges && supportsSnippetEdits
    ? [{
        range: { start: insertion, end: insertion },
        snippet: StringValue.createSnippet(
          template.newText.replace(/[\\$}]/g, "\\$&")
            .replace(" * @brief", " * @brief $0"),
        ),
      }]
    : null;
  return [{
    title: "Generate documentation template",
    kind,
    edit: supportsDocumentChanges ? {
      documentChanges: [{
        textDocument: { uri: document.uri, version: document.version },
        edits: snippetEdits ?? edits,
      }],
    } : { changes: { [document.uri]: edits } },
  }];
};
