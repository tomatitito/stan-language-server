import {
  TextDocuments,
  WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { join } from "path";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI, Utils } from "vscode-uri";
import type { FileSystemReader } from "../../types";

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
  includePaths: string[],
  logger: RemoteConsole,
  reader?: FileSystemReader
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
            includePaths,
            filename,
            reader
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
  includePaths: string[],
  filename: Filename,
  reader?: FileSystemReader
): Promise<FileContent | FilePathError> => {
  const currentDir = Utils.dirname(URI.parse(document.uri));

  let includedFileContent = await readIncludedFileFromWorkspace(
    documentManager,
    workspaceFolders,
    filename,
    currentDir
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  if (reader){
    includedFileContent = await readIncludedFileFromFileSystem(filename, [
      currentDir.fsPath,
      ...includePaths,
    ], reader);
  }

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  return Promise.resolve({ msg: `File not found: ${filename}` });
};

const readIncludedFileFromWorkspace = (
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  filename: Filename,
  currentDir: URI,
): Promise<FileContent | FilePathError> => {
  const searchFolders = [
    { uri: currentDir.toString(), name: "stan file directory" },
    ...workspaceFolders,
  ];

  const paths = searchFolders.map((folder) => folder.uri + "/" + filename);
  const documents = paths.map((path) => {
    const doc = documentManager.get(path);
    console.log(
      `Looking for included file at: ${path} -> ${doc ? "found" : "not found"}`
    );
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

const readIncludedFileFromFileSystem = async (
  filename: Filename,
  dirs: string[],
  fileSystemReader: FileSystemReader
): Promise<FileContent | FilePathError> => {
  for (const currentDir of dirs) {
    try {
      const localPath = join(currentDir, filename);
      return await fileSystemReader(localPath);
    } catch (error) { }
  }
  return Promise.resolve({ msg: `File not found: ${filename}` });
};
