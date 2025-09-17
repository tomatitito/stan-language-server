import { TextDocument } from "vscode-languageserver-textdocument";
import getIncludes, {
  isFilePathError,
  type FileContent,
  type Filename,
  type FilePathError,
} from "./includes";
import type { StancFunction, StancReturn } from "../types/common";
import { URI } from "vscode-uri";

// eslint-disable-next-line @typescript-eslint/no-var-requires
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

    const filename = URI.parse(document.uri).fsPath;
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
    return stanc(filename, code, stanc_args, successfulIncludes);
  };

export function getMathSignatures(): string {
  return stancjs.dump_stan_math_signatures();
}

export function getMathDistributions(): string {
  return stancjs.dump_stan_math_distributions();
}

export default compile(getIncludes);
