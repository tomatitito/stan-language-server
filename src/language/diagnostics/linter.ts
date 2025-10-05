// taken from vscode-stan-extension

import type { StancReturn } from "stanc3";
import type { Range } from "vscode-languageserver";

function getRangeFromMessage(message: string): Range | undefined {
  if (!message) return undefined;
  // format is "in 'filename', line (#), column (#) to (line #,)? column (#)"
  const start = message.matchAll(/'.*', line (\d+), column (\d+)( to)?/g);
  // there will be multiple in the case of #included files
  const lastMatch = Array.from(start).pop();
  if (!lastMatch || !lastMatch[1] || !lastMatch[2]) {
    return undefined;
  }
  // stanc outputs 1-based lines but 0-based columns, go figure
  const startLine = parseInt(lastMatch[1]) - 1;
  const startColumn = parseInt(lastMatch[2]);

  let endLine = startLine;
  let endColumn = startColumn;

  if (lastMatch[3]) {
    // " to" was matched
    const end = message.match(/to (line (\d+), )?column (\d+)/);
    if (end && end[3]) {
      if (end[1] && end[2]) {
        endLine = parseInt(end[2]) - 1;
      }
      endColumn = parseInt(end[3]);
    }
  }

  return {
    start: { line: startLine, character: startColumn },
    end: { line: endLine, character: endColumn },
  };
}

function getWarningMessage(message: string) {
  let warning = message.replace(/Warning.*column \d+: /s, "");
  warning = warning.replace(/\s+/gs, " ");
  warning = warning.trim();
  warning = message.includes("included from")
    ? "Warning in included file:\n" + warning
    : warning;
  return warning;
}

function getErrorMessage(message: string) {
  let error = message;
  // cut off code snippet for display
  if (message.includes("------\n")) {
    error = error.split("------\n")[2] ?? error;
  }
  error = error.trim();
  error = message.includes("included from")
    ? "Error in included file:\n" + error
    : error;
  error = error.includes("given information about")
    ? error +
    "\nTry opening the included file and making the Stan language server aware of it."
    : error;
  return error;
}

function provideErrorMessageAndRange(message: string) {
  return { range: getRangeFromMessage(message), message: getErrorMessage(message) };
}

function provideWarningMessageAndRange(message: string) {
  return { range: getRangeFromMessage(message), message: getWarningMessage(message) };
}

export function provideDiagnostics(compilerResult: StancReturn) {
  const errorDiagnostics = compilerResult
    .errors?.map(msg => {
      return provideErrorMessageAndRange(msg);
    }).filter((item): item is { range: Range, message: string } => (item.range !== undefined)).map(({ range, message }) => {
      return {
        range,
        severity: "error",
        message,
      }
    }) ?? [];

  const warningDiagnostics = compilerResult
    .warnings?.map(msg => {
      return provideWarningMessageAndRange(msg);
    }).filter((item): item is { range: Range, message: string } => (item.range !== undefined)).map(({ range, message }) => {
      return {
        range,
        severity: "warning",
        message,
      }
    }) ?? [];

  return [...errorDiagnostics, ...warningDiagnostics];
}
