import { TextDocuments, WorkspaceFolder, type RemoteConsole } from "vscode-languageserver";
import { dirname, join } from "path";
import { fileURLToPath } from "bun";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  getFilenames,
  type Filename,
  type FilePathError,
  isFilePathError,
  type FileContent,
} from "../../stanc/includes";
import { promises } from "fs";

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
            filename,
          );
          return [filename, content] as [Filename, FileContent];
        } catch (err) {
          return [filename, { msg: `${(err as Error).message}` }] as [
            Filename,
            FilePathError,
          ];
        }
      }),
    );

    const validResults = allResults.filter(
      ([_, content]) => !isFilePathError(content),
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
  filename: Filename,
): Promise<FileContent | FilePathError> => {
  const currentDir = dirname(fileURLToPath(document.uri));
  let includedFileContent = await readIncludedFileFromWorkspace(
    documentManager,
    workspaceFolders,
    filename,
    currentDir,
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  includedFileContent = await readIncludedFileFromFileSystem(
    filename,
    currentDir,
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
  currentDir: string,
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

const readIncludedFileFromFileSystem = async (
  filename: Filename,
  currentDir: string,
): Promise<FileContent | FilePathError> => {
  const localPath = join(currentDir, filename);

  try {
    return await promises.readFile(localPath, "utf-8");
  } catch (error) {
    return Promise.resolve({ msg: `File not found: ${filename}` });
  }
};
