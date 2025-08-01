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

export function isFilePathError(value: unknown): value is FilePathError {
  return typeof value === "object" && value !== null && "msg" in value;
}

export const getIncludes = (readFileFn: (filename: string) => Promise<string>) => async (fileContent: FileContent): Promise<Record<Filename, FileContent | FilePathError>> => {
  const filenames = getFilenames(fileContent);
  const results = await Promise.all(filenames.map(async (filename) => {
    try {
      const content = await readFileFn(filename);
      return [filename, content] as [Filename, FileContent];
    } catch (err) {
      return [filename, { msg: `${(err as Error).message}` }] as [Filename, FilePathError];
    }
  }));
  return Object.fromEntries(results);
}

export default getIncludes((filename: string) => fs.readFile(filename, "utf-8"));

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
