import { fileURLToPath } from "url";
import { TextDocument } from "vscode-languageserver-textdocument";
import getIncludes, {
  isFilePathError,
  type FileContent,
  type Filename,
  type FilePathError,
} from "./includes";

type StancSuccess = {
  errors: undefined;
  result: string;
  warnings?: string[];
};

type StancFailure = {
  errors: string[];
  result: undefined;
  warnings?: string[];
};

type StancReturn = StancSuccess | StancFailure;

type StancFunction = (
  filename: string,
  code: string,
  options: string[],
  includes?: Record<string, string>,
) => StancReturn;

const stancjs = require("./stanc.js");
const stanc: StancFunction = stancjs.stanc;

const stanc_version = stanc("", "", ["version"]).result;

type GetIncludesFunction = (
  fileContent: FileContent,
) => Promise<Record<Filename, FileContent | FilePathError>>;

export const compile =
  (getIncludesFn: GetIncludesFunction) =>
  async (document: TextDocument, args: string[] = []): Promise<StancReturn> => {
    const lineLength = 78; // make this configurable

    const filename = fileURLToPath(document.uri);
    const code = document.getText();

    const includedFilenamesAndFileContents = await getIncludesFn(code);

    const filePathErrors = Object.values(
      includedFilenamesAndFileContents,
    ).filter(isFilePathError);
    if (filePathErrors.length > 0) {
      return {
        errors: filePathErrors.map((err) => err.msg),
        result: undefined,
      };
    }

    // At this point, all includes are successful, safe to cast
    const successfulIncludes = includedFilenamesAndFileContents as Record<
      Filename,
      FileContent
    >;

    const stanc_args = [
      "auto-format",
      `filename-in-msg=${filename}`,
      `max-line-length=${lineLength}`,
      "canonicalze=deprecations",
      "allow-undefined",
      ...args,
    ];
    // logger.appendLine(
    //   `Running stanc on ${filename} with args: ${stanc_args.join(", ")}, and includes: ${Object.keys(includes).join(", ")}`,
    // );
    return stanc(filename, code, stanc_args, successfulIncludes);
  };

export function getMathSignatures(): string {
  return stancjs.dump_stan_math_signatures();
}

export function getMathDistributions(): string {
  return stancjs.dump_stan_math_distributions();
}

export default compile(getIncludes);
