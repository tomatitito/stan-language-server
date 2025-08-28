export const isWordChar = (char: string) => {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    code === 95 // _
  );
};

export const isWhitespace = (char: string) => {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
};

export const previousWordBoundary = (text: string, pos: number) => {
  for (let i = pos - 1; i >= 0; i--) {
    const char = text[i];
    if (!isWordChar(char!)) {
      return i + 1;
    }
  }
  return 0;
};

export const wordUntilNextParenthesis = (text: string, pos: number) => {
  let seenSpace = false;
  for (let i = pos; i < text.length; i++) {
    const char = text[i]!;
    if (char === "(") {
      return i;
    }
    if (isWordChar(char)) {
      if (seenSpace) {
        return -1;
      }
    } else if (isWhitespace(char)) {
      seenSpace = true;
    } else {
      return -1;
    }
  }
  return -1;
};
