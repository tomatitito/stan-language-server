import {
  CompletionItemKind,
  type CompletionItem,
  type CompletionParams,
  type TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getMathDistributions } from "../../../stanc/compiler";
import { type Distribution } from "../../../types/completion";
import { getSearchableItems } from "../util";

const prepareDistributions = (): string[] => {
  return getMathDistributions()
    .split("\n")
    .map((line) => line.split(":")[0]?.trim() ?? "");
};

const getDistributions= (): Distribution[] => {
  return prepareDistributions()
    .filter((name) => name !== "")
    .map((name) => {
      return { name };
    });
};

export const provideDistributionCompletions =
  (getdistributionsFn: () => Distribution[]) =>
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

    const distributions = getdistributionsFn(); //getDistributions(getMathDistributionsAsStrings)();
    const searchableDistributions = getSearchableItems(distributions, {
      splitOnRegEx: /[\s_]/g,
      min: 0,
    });

    const match = lineText.match(/.*~\s*([\w_]*)$/);
    if (match) {
      const distName = match[1] || "";
      let completionProposals;
      if (distName === "") {
        completionProposals = distributions;
      } else {
        completionProposals = searchableDistributions.search(distName);
      }
      return completionProposals.map((d) => {
        return {
          label: d.name,
          kind: CompletionItemKind.Function,
        };
      });
    }
    return [];
  };

export default provideDistributionCompletions(getDistributions);
