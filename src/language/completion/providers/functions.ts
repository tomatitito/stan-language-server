import {
  CompletionItemKind,
  TextDocuments,
  type CompletionItem,
  type CompletionParams,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getMathSignatures } from "../../../stanc/compiler";
import type { StanFunction } from "../../../types/completion";
import { getSearchableItems } from "../util";

export const getFunctions = (): StanFunction[] => {
  const signatures = getMathSignatures()
    .split("\n")
    .map((line) => line.split("(", 1)[0]?.trim() ?? "");

  const deduplicatedSignatures = [...new Set(signatures)].map((name) => {
    return { name };
  });
  const additionalStatements = ["print", "reject", "fatal_error", "target"].map(
    (name) => {
      return { name };
    },
  );
  return [...deduplicatedSignatures, ...additionalStatements];
};

export const provideFunctionCompletions =
  (getFunctionsFn: () => StanFunction[]) =>
  (
    params: CompletionParams,
    documents: TextDocuments<TextDocument>,
  ): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Look backwards to find the pattern ~distribution_name
    const lineStart = document.offsetAt({ line: position.line, character: 0 });
    const lineText = text.substring(lineStart, offset);

    const functions = getFunctionsFn(); //getDistributions(getMathDistributionsAsStrings)();
    const searchableFunctions = getSearchableItems(functions, {
      splitOnRegEx: /[\s_]/g,
      min: 0,
    });

    const match = lineText.match(/(?:^|\s)([\w_]+)$/);
    if (match) {
      const fnName = match[1] || "";
      const completionProposals = searchableFunctions.search(fnName);
      return completionProposals.map((d) => {
        return {
          label: d.name,
          kind: CompletionItemKind.Function,
        };
      });
    }
    return [];
  };

export default provideFunctionCompletions(getFunctions);
