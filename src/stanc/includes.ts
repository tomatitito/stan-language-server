import { promises as fs } from "fs";

export type Filename = string;
export type FilePath = string;
export type FileContent = string;
type FilePathError = { msg: string };

export function getFilenames(fileContent: string): Filename[] {
  const includePattern = /#include\s*[<"]?([^>"\s]*)[>"]?/g;

  const matches = Array.from(fileContent.matchAll(includePattern));
  const results = matches.map((match) => match[1] || "");

  return results;
}

async function checkFilePath(
  filepath: string,
): Promise<FilePath | FilePathError> {
  try {
    await fs.access(filepath);
    return filepath;
  } catch (err) {
    return { msg: `${(err as Error).message}` };
  }
}

export function isFilePathError(value: unknown): value is FilePathError {
  return typeof value === "object" && value !== null && "msg" in value;
}

export async function getIncludedFilePaths(
  fileContent: FileContent,
): Promise<Record<Filename, FilePath | FilePathError>> {
  const filenames = getFilenames(fileContent);
  const contents = await Promise.all(
    filenames.map(async (filename) => {
      const path = await checkFilePath(filename);
      // const content = await fs.readFile(path, "utf-8");
      return [filename, path] as [Filename, FilePath | FilePathError];
    }),
  );

  return Object.fromEntries(contents);
}

export async function getFileContents(
  files: Record<Filename, FilePath>,
): Promise<Record<Filename, FileContent>> {
  const entries = await Promise.all(
    Object.entries(files).map(async ([filename, path]) => {
      const content = await fs.readFile(path, "utf-8");
      return [filename, content] as [Filename, FileContent];
    }),
  );
  return Object.fromEntries(entries);
}
