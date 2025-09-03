import { TextDocuments, URI, WorkspaceFolder } from "vscode-languageserver";
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
): Promise<Record<Filename, FileContent>> {
  const includeFilenames = getFilenames(document.getText());

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

  return Promise.resolve(Object.fromEntries(validResults));
}

const readIncludedFile = async (
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  filename: Filename,
): Promise<FileContent | FilePathError> => {
  const currentDir = dirname(fileURLToPath(document.uri));
  let includedFileContent = await readIncludedFileFromWorkspace(
    document,
    documentManager,
    workspaceFolders,
    filename,
    currentDir,
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  includedFileContent = await readIncludedFileFromFileSystem(
    document,
    filename,
    currentDir,
  );

  if (!isFilePathError(includedFileContent)) {
    return Promise.resolve(includedFileContent);
  }

  return Promise.resolve({ msg: `File not found: ${filename}` });
};

const readIncludedFileFromWorkspace = (
  document: TextDocument,
  documentManager: TextDocuments<TextDocument>,
  workspaceFolders: WorkspaceFolder[],
  filename: Filename,
  currentDir: string,
): Promise<FileContent | FilePathError> => {
  workspaceFolders = [
    { uri: currentDir.toString(), name: "current directory" },
    ...workspaceFolders,
  ];

  const includedFile = workspaceFolders
    .map((folder) => folder.uri + "/" + filename)
    .map((path) => documentManager.get(path))
    .filter((doc): doc is TextDocument => doc !== undefined)[0];

  if (!includedFile) {
    return Promise.resolve({ msg: `File not found: ${filename}` });
  }
  return Promise.resolve(includedFile.getText());
};

const readIncludedFileFromFileSystem = async (
  document: TextDocument,
  filename: Filename,
  currentDir: string,
): Promise<FileContent | FilePathError> => {
  const includePath = URL.parse(join(currentDir, filename));

  if (includePath) {
    return promises.readFile(includePath, "utf-8");
  }

  return Promise.resolve({ msg: `File not found: ${filename}` });
};

