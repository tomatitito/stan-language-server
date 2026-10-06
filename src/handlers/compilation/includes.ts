import type {
  RemoteConsole,
  WorkspaceFolder,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI, Utils } from "vscode-uri";
import type {
  TextDocumentProvider,
  WorkspaceFileReader,
} from "../../types";

export type Filename = string;
export type FileContent = string;
export type FilePathError = { msg: string };

export function getFilenames(fileContent: string): Filename[] {
  const includePattern = /#include\s*[<"]?([^>"\s]*)[>"]?/g;
  return Array.from(fileContent.matchAll(includePattern)).map(
    (match) => match[1] || "",
  );
}

export function isFilePathError(value: unknown): value is FilePathError {
  return typeof value === "object" && value !== null && "msg" in value;
}

export async function handleIncludes(
  document: TextDocument,
  documentManager: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  includePaths: string[],
  logger: RemoteConsole,
  reader?: WorkspaceFileReader,
  alreadyIncluded: Set<Filename> = new Set(),
): Promise<Record<Filename, FileContent>> {
  try {
    const includeFilenames = getFilenames(document.getText());
    if (includeFilenames.length === 0) {
      return {};
    }

    const allResults = await Promise.all(
      includeFilenames.map(async (filename) => {
        if (alreadyIncluded.has(filename)) {
          return [filename, { msg: `File already included: ${filename}` }];
        }
        try {
          const content = await readIncludedFile(
            document,
            documentManager,
            workspaceFolders,
            includePaths,
            filename,
            reader,
          );
          return [filename, content];
        } catch (err) {
          return [filename, { msg: `${(err as Error).message}` }];
        }
      }),
    );

    const validResults = allResults.filter(
      ([, content]) => !isFilePathError(content),
    ) as [Filename, TextDocument][];

    const currentlyIncluded = new Set(
      validResults.map(([filename]) => filename),
    ).union(alreadyIncluded);

    const recursiveIncludes = await Promise.all(
      validResults.map(([, content]) =>
        handleIncludes(
          content,
          documentManager,
          workspaceFolders,
          includePaths,
          logger,
          reader,
          currentlyIncluded,
        ),
      ),
    );

    const results = validResults
      .map(([filename, contents]) => [filename, contents.getText()])
      .concat(recursiveIncludes.map(Object.entries).flat());

    return Object.fromEntries(results);
  } catch (error) {
    logger.warn(`Resolving included files failed: ${error}`);
    return {};
  }
}

const candidateUris = (
  documentUri: string,
  workspaceFolders: readonly WorkspaceFolder[],
  includePaths: readonly string[],
  filename: Filename,
): readonly string[] => {
  const bases = [
    Utils.dirname(URI.parse(documentUri)),
    ...workspaceFolders.map(({ uri }) => URI.parse(uri)),
    ...includePaths.map((includePath) => URI.file(includePath)),
  ];

  return [...new Set(bases.map((base) => Utils.joinPath(base, filename).toString()))];
};

const readIncludedFile = async (
  document: TextDocument,
  documentManager: TextDocumentProvider,
  workspaceFolders: WorkspaceFolder[],
  includePaths: string[],
  filename: Filename,
  reader?: WorkspaceFileReader,
): Promise<TextDocument | FilePathError> => {
  for (const uri of candidateUris(
    document.uri,
    workspaceFolders,
    includePaths,
    filename,
  )) {
    const openDocument = documentManager.get(uri);
    if (openDocument) {
      return openDocument;
    }

    try {
      const file = await reader?.(uri);
      if (file) {
        return TextDocument.create(
          file.uri,
          file.uri.endsWith(".stanfunctions") ? "stanfunctions" : "stan",
          typeof file.version === "number" ? file.version : 0,
          file.text,
        );
      }
    } catch {
      // Try remaining workspace/include-path candidates.
    }
  }

  return { msg: `File not found: ${filename}` };
};
