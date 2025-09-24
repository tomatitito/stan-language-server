import { type StanDiagnostic, DiagnosticSeverity } from "../../types/diagnostics";
import type { StancReturn } from "../../types/common";
import {
  rangeFromMessage,
  getWarningMessage,
  getErrorMessage,
} from "./linter";
import { SERVER_ID } from "../../constants";


export function provideDiagnostics(compilerResult: StancReturn): StanDiagnostic[] {
  const diagnostics: StanDiagnostic[] = [];

  if (compilerResult.errors) {
    for (const error of compilerResult.errors) {
      const range = rangeFromMessage(error);
      if (range) {
        diagnostics.push({
          range,
          severity: DiagnosticSeverity.Error,
          message: getErrorMessage(error),
          source: SERVER_ID,
        });
      }
    }
  }
  if (compilerResult.warnings) {
    for (const warning of compilerResult.warnings) {
      const range = rangeFromMessage(warning);
      if (range) {
        diagnostics.push({
          range,
          severity: DiagnosticSeverity.Warning,
          message: getWarningMessage(warning),
          source: SERVER_ID,
        });
      }
    }
  }
  return diagnostics;

}
