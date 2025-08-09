import TrieSearch from "trie-search";
import {
  CompletionItemKind,
  type CompletionItem,
  type CompletionParams,
  type Connection,
  type TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getMathDistributions } from "../../../stanc/compiler";
import { type Distribution } from "../../../types/completion";
import { getSearchableItems } from "../util";

const mathDistributions = getMathDistributions();
const distLines = mathDistributions
  .split("\n")
  .filter((line) => line.trim() !== "");

// TODO: move into compiler module?
const getMathDistributionsAsStrings = (): string[] => {
  return getMathDistributions()
    .split("\n")
    .map((line) => line.split(":")[0]?.trim() ?? "");
};

const getDistributions =
  (getMathDistributionsFn: () => string[]) => (): Distribution[] => {
    const distributions = getMathDistributionsFn()
      .map((line) => line.split(":")[0]?.trim() ?? "")
      .filter((name) => name !== "")
      .map((name) => {
        return { name };
      });
    return distributions;
  };

export const provideDistributionCompletions = (
  params: CompletionParams,
  documents: TextDocuments<TextDocument>,
  connection: Connection,
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

  const distributions = getDistributions(getMathDistributionsAsStrings)();
  const searchableDistributions = getSearchableItems(distributions, {
    splitOnRegEx: /[\s_]/g,
    min: 0,
  });

  const match = lineText.match(/.*~\s*([\w_]*)$/);
  connection.console.info(`Regex match: ${match}`);
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

export const hurz = distLines
  .map((line) => line.split(":")[0]?.trim() ?? "")
  .filter((name) => name !== "")
  .sort();
