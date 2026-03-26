import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  InsertTextMode,
} from "vscode-languageserver";

function snippetToCompletionItem(snippet: {
  name: string;
  body: string[];
  description: string;
}): CompletionItem {
  return {
    label: snippet.name,
    kind: CompletionItemKind.Snippet,
    insertText: snippet.body.join("\n"),
    insertTextFormat: InsertTextFormat.Snippet,
    insertTextMode: InsertTextMode.adjustIndentation,
    detail: snippet.description,
  };
}

export const SNIPPETS = [
  {
    name: "else",
    body: ["else {", "   ${0:/* code */}", "}"],
    description: "Code snippet for 'else' conditional",
  },
  {
    name: "elseif",
    body: ["else if (${1:/* condition */}) {", "   ${0:/* code */}", "}"],
    description: "Code snippet for 'else if' conditional",
  },
  {
    name: "for",
    body: [
      "for (${1:identifier} in ${2:collection}) {",
      "   ${0:/* code */}",
      "}",
    ],
    description: "Code snippet for 'for' loop",
  },
  {
    name: "if",
    body: ["if (${1:/* condition */}) {", "   ${0:/* code */}", "}"],
    description: "Code snippet for 'if' conditional",
  },
  {
    name: "ifelse",
    body: [
      "if (${1:/* condition */}) {",
      "   ${2:/* code */}",
      "} else {",
      "   ${0:/* code */}",
      "}",
    ],
    description: "Code snippet for 'if-else' conditional block",
  },
  {
    name: "while",
    body: ["while (${1:/* condition */}) {", "   ${0:/* code */}", "}"],
    description: "Code snippet for 'while' loop",
  },
  {
    name: "profile",
    body: ['profile("${1:name}") {', "   ${0:/* code to be profiled */}", "}"],
    description: "Code snippet for 'profile' block",
  },
  {
    name: "data",
    body: ["data {", "   ${0:/* ... declarations ... */}", "}"],
    description: "Code snippet for 'data' block",
  },
  {
    name: "transformed data",
    body: [
      "transformed data {",
      "   ${0:/* ... declarations ... statements ... */}",
      "}",
    ],
    description: "Code snippet for 'transformed data' block",
  },
  {
    name: "parameters",
    body: ["parameters {", "   ${0:/* ... declarations ... */}", "}"],
    description: "Code snippet for 'parameters' block",
  },
  {
    name: "transformed parameters",
    body: [
      "transformed parameters {",
      "   ${0:/* ... declarations ... statements ... */}",
      "}",
    ],
    description: "Code snippet for 'transformed parameters' block",
  },
  {
    name: "model",
    body: ["model {", "   ${0:/* ... declarations ... statements ... */}", "}"],
    description: "Code snippet for 'model' block",
  },
  {
    name: "generated quantities",
    body: [
      "generated quantities {",
      "   ${0:/* ... declarations ... statements ... */}",
      "}",
    ],
    description: "Code snippet for 'generated quantities' block",
  },
  {
    name: "functions",
    body: [
      "functions {",
      "   ${0:/* ... function declarations and definitions ... */}",
      "}",
    ],
    description: "Code snippet for 'functions' block",
  },
  {
    name: "include",
    body: ['#include "${1:filename}"'],
    description: "Code snippet for 'include' preprocessor",
  },
  {
    name: "target",
    body: ["target += ${1};"],
    description: "Code snippet for 'target +=' statement",
  },
  {
    name: "jacobian",
    body: ["jacobian += ${1};"],
    description: "Code snippet for 'jacobian +=' statement",
  },
].map(snippetToCompletionItem);
