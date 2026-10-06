import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceFolder } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type {
  DocumentStoreReader,
  FileUri,
  WorkspaceFile,
} from "../types/common.ts";

const supportedStanExtensions = [".stan", ".stanfunctions"] as const;

const filePathToUri = (filePath: string): FileUri =>
  URI.file(filePath).toString();

const uriToFilePath = (uri: FileUri): string => {
  const parsed = URI.parse(uri);
  if (parsed.scheme !== "file") {
    throw new Error(`Cannot access non-file URI on disk: ${uri}`);
  }
  return parsed.fsPath;
};

const isSupportedStanUri = (uri: FileUri): boolean => {
  try {
    const uriPath = new URL(uri).pathname.toLowerCase();
    return supportedStanExtensions.some((extension) =>
      uriPath.endsWith(extension)
    );
  } catch {
    return false;
  }
};

const sortedDirectoryEntries = async (directoryPath: string) => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  return entries.sort((left, right) => left.name.localeCompare(right.name));
};

const listFilesRecursive = async (
  directoryPath: string,
): Promise<FileUri[]> => {
  const uris: FileUri[] = [];
  const entries = await sortedDirectoryEntries(directoryPath);

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      try {
        uris.push(...await listFilesRecursive(entryPath));
      } catch {
        // Unreadable child directory does not hide readable siblings.
      }
    } else if (entry.isFile()) {
      uris.push(filePathToUri(entryPath));
    }
  }

  return uris;
};

const listFolderFiles = async (
  uri: FileUri,
): Promise<readonly FileUri[]> => {
  const filePath = uriToFilePath(uri);
  const stats = await fs.stat(filePath);
  if (stats.isFile()) {
    return [filePathToUri(filePath)];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  return await listFilesRecursive(filePath);
};

export const listWorkspaceFiles = async (
  workspaceFolders: readonly WorkspaceFolder[],
): Promise<readonly FileUri[]> => {
  const listings = await Promise.all(
    workspaceFolders.map(async ({ uri }) => {
      try {
        return await listFolderFiles(uri);
      } catch {
        return [];
      }
    }),
  );

  return [...new Set(listings.flat().filter(isSupportedStanUri))].sort(
    (left, right) => left.localeCompare(right),
  );
};


const readOpenDocument = (
  uri: FileUri,
  documents: DocumentStoreReader,
): WorkspaceFile | null => {
  const document = documents.get(uri);
  return document ? ((document: TextDocument): WorkspaceFile => ({
      uri: document.uri,
      text: document.getText(),
      version: document.version,
      location: "documentStore",
  }))(document) : null;
};

const readFromDisk = async (
  uri: FileUri,
): Promise<WorkspaceFile | null> => {
  try {
    const text = await fs.readFile(uriToFilePath(uri), "utf8");
    return {
      uri,
      text,
      version: createHash("sha256").update(text).digest("hex"),
      location: "disk",
    };
  } catch {
    return null;
  }
};

export const readWorkspaceFile = async (
  uri: FileUri,
  documents: DocumentStoreReader,
): Promise<WorkspaceFile | null> => {
  const openFile = readOpenDocument(uri, documents);
  if (openFile) {
    return openFile;
  }

  const diskFile = await readFromDisk(uri);

  // Document may have opened while disk read was pending.
  return readOpenDocument(uri, documents) ?? diskFile;
};
