export const tryFunctionHover = (
  text: string,
  beginningOfWord: number,
  endOfWord: number,
): string | null => {
  const funcName = text.substring(beginningOfWord, endOfWord).trim();
  if (!funcName) return null;
  return funcName;
};
