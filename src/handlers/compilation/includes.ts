import {
  TextDocuments,
  WorkspaceFolder,
  type RemoteConsole,
} from "vscode-languageserver";
import { join } from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
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
  reader?: FileSystemReader,
  alreadyIncluded: Set<Filename> = new Set()
): Promise<Record<Filename, FileContent>> {
  try {
    const includeFilenames = getFilenames(document.getText());

    if (includeFilenames.length === 0) {
      return {};
    }

    const allResults = await Promise.all(
      includeFilenames.map(async (filename) => {
        if (alreadyIncluded.has(filename)) {
          return [filename, { msg: `File already included: ${filename}` }] as [
            Filename,
            FilePathError
          ];
        }
        try {
          const content = await readIncludedFile(
            document,
            documentManager,
            workspaceFolders,
            includePaths,
            filename,
            reader
          );
          return [filename, content] as [
            Filename,
            TextDocument | FilePathError
          ];
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
    ) as [Filename, TextDocument][];

    const currentlyIncluded = new Set(
      validResults.map(([filename, _]) => filename)
    ).union(alreadyIncluded);

    const recursiveIncludes = await Promise.all(
      validResults.map(
        async ([_, content]) =>
          await handleIncludes(
            content,
            documentManager,
            workspaceFolders,
            includePaths,
            logger,
            reader,
            currentlyIncluded
          )
      )
    );

    const results = validResults
      .map(([filename, contents]) => [filename, contents.getText()])
      .concat(recursiveIncludes.map(Object.entries).flat());

    return Object.fromEntries(results);
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
): Promise<TextDocument | FilePathError> => {
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

  if (reader) {
    includedFileContent = await readIncludedFileFromFileSystem(
      filename,
      [currentDir.fsPath, ...includePaths],
      reader
    );
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
  currentDir: URI
): Promise<TextDocument | FilePathError> => {
  const searchFolders = [
    { uri: currentDir.toString(), name: "stan file directory" },
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
  return Promise.resolve(includedFile);
};

const readIncludedFileFromFileSystem = async (
  filename: Filename,
  dirs: string[],
  fileSystemReader: FileSystemReader
): Promise<TextDocument | FilePathError> => {
  for (const currentDir of dirs) {
    try {
      const localPath = join(currentDir, filename);
      const content = await fileSystemReader(localPath);
      return TextDocument.create(
        URI.file(localPath).toString(),
        "stan",
        0,
        content
      );
    } catch (error) {}
  }
  return Promise.resolve({ msg: `File not found: ${filename}` });
};
