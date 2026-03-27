import type { FileContent, Filename } from "../handlers/compilation/includes";

export type FileSystemReader = (filename: Filename) => Promise<FileContent>;
