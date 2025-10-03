// Completion handler - manages LSP protocol conversion and coordinates providers
import {
  type CompletionParams,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

// Import pure providers
import { 
  provideKeywordCompletions,
} from "../language/completion/providers/keywords";
import { 
  provideDistributionCompletions,
} from "../language/completion/providers/distributions";
import { 
  provideDatatypeCompletions,
} from "../language/completion/providers/datatypes";
import { 
  provideFunctionCompletions,
} from "../language/completion/providers/functions";
import { 
  provideConstraintCompletions,
} from "../language/completion/providers/constraints";

// Import existing types
import type { 
  Position,
  Keyword, 
  Distribution, 
  Datatype, 
  StanFunction, 
  Constraint 
} from "../types/completion";
import {
  dump_stan_math_distributions,
  dump_stan_math_signatures,
} from "stanc3";

// Convert existing types to LSP completion items
function keywordToCompletionItem(keyword: Keyword): CompletionItem {
  return {
    label: keyword.name,
    kind: CompletionItemKind.Keyword,
  };
}

function distributionToCompletionItem(distribution: Distribution): CompletionItem {
  return {
    label: distribution.name,
    kind: CompletionItemKind.Function,
  };
}

function datatypeToCompletionItem(datatype: Datatype): CompletionItem {
  return {
    label: datatype.name,
    kind: CompletionItemKind.Class,
  };
}

function functionToCompletionItem(func: StanFunction): CompletionItem {
  return {
    label: func.name,
    kind: CompletionItemKind.Function,
  };
}

function constraintToCompletionItem(constraint: Constraint): CompletionItem {
  return {
    label: constraint.name,
    kind: CompletionItemKind.Property,
  };
}

// Get distributions data
function getDistributionData(): string[] {
  return dump_stan_math_distributions()
    .split("\n")
    .map((line) => line.split(":")[0]?.trim() ?? "")
    .filter((name) => name !== "");
}

// Get function signatures data
function getFunctionData(): string[] {
  return dump_stan_math_signatures().split("\n");
}

export function handleCompletion(
  params: CompletionParams,
  documents: TextDocuments<TextDocument>,
): CompletionItem[] {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const position = params.position;

  // Get completion items from all providers
  const keywords = provideKeywordCompletions(text, position);
  const distributions = provideDistributionCompletions(text, position, getDistributionData());
  const datatypes = provideDatatypeCompletions(text, position);
  const functions = provideFunctionCompletions(text, position, getFunctionData());
  const constraints = provideConstraintCompletions(text, position);

  // Convert all items to LSP format and combine
  const allItems = [
    ...keywords.map(keywordToCompletionItem),
    ...distributions.map(distributionToCompletionItem),
    ...datatypes.map(datatypeToCompletionItem),
    ...functions.map(functionToCompletionItem),
    ...constraints.map(constraintToCompletionItem),
  ];

  return allItems;
}