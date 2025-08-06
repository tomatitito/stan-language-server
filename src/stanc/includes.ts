import { promises as fs } from "fs";

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

export const getIncludes =
  (readFileFn: (filename: string) => Promise<string>) =>
  async (fileContent: FileContent): Promise<Record<Filename, FileContent>> => {
    const filenames = getFilenames(fileContent);
    const validResults = (await Promise.all(
      filenames.map(async (filename) => {
        try {
          const content = await readFileFn(filename);
          return [filename, content] as [Filename, FileContent];
        } catch (err) {
          return [filename, { msg: `${(err as Error).message}` }] as [
            Filename,
            FilePathError
          ];
        }
      })
    )).filter(
      ([_, content]) => !isFilePathError(content),
    ) as [Filename, FileContent][];
    return Object.fromEntries(validResults);
  };

export default getIncludes((filename: string) =>
  fs.readFile(filename, "utf-8"),
);
