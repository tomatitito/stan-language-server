import TrieSearch from "trie-search";
import { getMathDistributions } from "../../../stanc/compiler";
import {
    CompletionItemKind,
  type CompletionItem,
  type CompletionParams,
  // type TextDocument,
  type TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

type Distribution = {
  name: string;
};

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

const getSearchableDistributions = (distributions: Distribution[]) => {
  const builtInDistributions: TrieSearch<Distribution> = new TrieSearch(
    "name",
    {
      splitOnRegEx: /[\s_]/g,
    },
  );
  builtInDistributions.addAll(distributions);
  return builtInDistributions;
};

export const provideDistributionCompletions = (
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

  const distributions = getDistributions(getMathDistributionsAsStrings)();
  const searchableDistributions = getSearchableDistributions(distributions); // provide as parameter?

  const match = lineText.match(/~\s*([\w_]*)$/);
  if (match) {
    const distName = match[1] || "";
    const completionProposals = searchableDistributions.search(distName);
    return completionProposals.map(d => {
      return {
        label: d.name,
        kind: CompletionItemKind.Function,
      };
    });
  }
  return []
};

export const hurz = distLines
  .map((line) => line.split(":")[0]?.trim() ?? "")
  .filter((name) => name !== "")
  .sort();
