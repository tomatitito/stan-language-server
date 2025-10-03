import type { FileContent, Filename } from "../handlers/compilation/includes";

export interface Position {
  line: number;
  character: number;
}

export type FileSystemReader = (filename: Filename) => Promise<FileContent>;
