import {
  TextDocuments,
  WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { dirname, join } from "path";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

export type Filename = string;
export type FileContent = string;
export type FilePathError = { msg: string };

export function getFilenames(fileContent: string): Filename[] {
  const includePattern = /#include\s*[<"]?([^>"\s]*)[>"]?/g;

  const matches = Array.from(fileContent.matchAll(includePattern));
  const results = matches.map((match) => match[1] || "");

  return results;
}

export function isFilePathError(value: unknown): value is FilePathError {
  return typeof value === "object" && value !== null && "msg" in value;
}

export async function handleIncludes(
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  logger: RemoteConsole
): Promise<Record<Filename, FileContent>> {
  try {
    const includeFilenames = getFilenames(document.getText());

    if (includeFilenames.length === 0) {
      return {};
    }

    const allResults = await Promise.all(
      includeFilenames.map(async (filename) => {
        try {
          const content = await readIncludedFile(
            document,
            documentManager,
            workspaceFolders,
            filename
          );
          return [filename, content] as [Filename, FileContent];
        } catch (err) {
          return [filename, { msg: `${(err as Error).message}` }] as [
            Filename,
            FilePathError
          ];
        }
      })
    );

    const validResults = allResults.filter(
      ([_, content]) => !isFilePathError(content)
    ) as [Filename, FileContent][];

    return Object.fromEntries(validResults);
  } catch (error) {
    logger.warn(`Resolving included files failed: ${error}`);
    return Promise.resolve({});
  }
}

const readIncludedFile = async (
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  filename: Filename
): Promise<FileContent | FilePathError> => {
  // TODO: allow for configuration of include paths
  const currentDir = dirname(URI.parse(document.uri).fsPath);

  let includedFileContent = await readIncludedFileFromWorkspace(
    documentManager,
    workspaceFolders,
    filename,
    currentDir
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  includedFileContent = await readIncludedFileFromFileSystem(
    filename,
    currentDir
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  return Promise.resolve({ msg: `File not found: ${filename}` });
};

const readIncludedFileFromWorkspace = (
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  filename: Filename,
  currentDir: string
): Promise<FileContent | FilePathError> => {
  const searchFolders = [
    { uri: currentDir.toString(), name: "current directory" },
    ...workspaceFolders,
  ];

  const paths = searchFolders.map((folder) => folder.uri + "/" + filename);
  const documents = paths.map((path) => {
    const doc = documentManager.get(path);
    return { path, doc };
  });

  const includedFile = documents
    .filter(({ doc }) => doc !== undefined)
    .map(({ doc }) => doc)[0];

  if (!includedFile) {
    return Promise.resolve({ msg: `File not found: ${filename}` });
  }
  return Promise.resolve(includedFile.getText());
};

export type FileSystemReader = (filename: Filename) => Promise<FileContent>;
let fileSystemReader: FileSystemReader | undefined = undefined;

export const setFileSystemReader = (reader: FileSystemReader) => {
  fileSystemReader = reader;
};

const readIncludedFileFromFileSystem = async (
  filename: Filename,
  currentDir: string
): Promise<FileContent | FilePathError> => {
  try {
    if (fileSystemReader !== undefined) {
      const localPath = join(currentDir, filename);
      return await fileSystemReader(localPath);
    }
  } catch (error) {}
  return Promise.resolve({ msg: `File not found: ${filename}` });
};
