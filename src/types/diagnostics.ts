import type { Position } from "./common";

export type { Position };

export interface Range {
  start: Position;
  end: Position;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface StanDiagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
}