// Pure snippets provider - returns Snippet[] using existing types
import type { Snippet, Position } from "../../../types/completion";
import { getSearchableItems, getTextUpToCursor } from "../util";

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
];

const SEARCHABLE_SNIPPETS = getSearchableItems(SNIPPETS, {
  splitOnRegEx: /[\s_]/g,
  min: 0,
});

export const provideSnippetCompletions = (
  text: string,
  position: Position,
): Snippet[] => {
  const textUpToCursor = getTextUpToCursor(text, position);

  // Look for word pattern at the end of current text
  const match = textUpToCursor.match(/(?:^|\s)([\w_]+)$/);
  if (match) {
    const snippetName = match[1] || "";
    const completionProposals = SEARCHABLE_SNIPPETS.search(snippetName);
    return completionProposals;
  }

  return [];
};
