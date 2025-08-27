import type { TextDocument } from "vscode-languageserver-textdocument";


export const tryFunctionHover = (
  text: string,
  beginningOfWord: number,
  endOfWord: number,
): string | null => {

  const func = text.substring(beginningOfWord, endOfWord).trim();
  const funcName = func.replace("(", "").trim();
  if (!funcName) return null;
  return funcName;
};
