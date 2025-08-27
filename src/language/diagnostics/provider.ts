import { type StanDiagnostic, DiagnosticSeverity } from "../../types/diagnostics";
import type { StancReturn } from "../../stanc/compiler";
import {
  rangeFromMessage,
  getWarningMessage,
  getErrorMessage,
} from "./linter";

export function provideDiagnostics(
  compilerResult: StancReturn,
): StanDiagnostic[] {
  const diagnostics: StanDiagnostic[] = [];

  if (compilerResult.errors === undefined) {
    // Successful compilation - process warnings
    if (compilerResult.warnings) {
      for (const warning of compilerResult.warnings) {
        const range = rangeFromMessage(warning);
        if (range) {
          diagnostics.push({
            range,
            severity: DiagnosticSeverity.Warning,
            message: getWarningMessage(warning),
            source: "stan-language-server",
          });
        }
      }
    }
  } else {
    // Failed compilation - process errors
    if (compilerResult.errors) {
      for (const error of compilerResult.errors) {
        const range = rangeFromMessage(error);
        if (range) {
          diagnostics.push({
            range,
            severity: DiagnosticSeverity.Error,
            message: getErrorMessage(error),
            source: "stan-language-server",
          });
        }
      }
    }
  }

  return diagnostics;
}
