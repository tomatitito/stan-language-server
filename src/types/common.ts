import type { FileContent, Filename } from "../handlers/compilation/includes";

export interface Position {
  line: number;
  character: number;
}

type StancSuccess = {
  errors: undefined;
  result: string;
  warnings?: string[];
};

type StancFailure = {
  errors: string[];
  result: undefined;
  warnings?: string[];
};

export type StancReturn = StancSuccess | StancFailure;

export type StancFunction = (
  filename: string,
  code: string,
  options: string[],
  includes?: Record<string, string>,
) => StancReturn;

export type FileSystemReader = (filename: Filename) => Promise<FileContent>;
