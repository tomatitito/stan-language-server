import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  isFilePathError,
  getFileContents,
  type FileContent,
  type Filename,
  type FilePath,
} from "./includes";

type StancReturnSuccess = {
  errors: undefined;
  result: string;
  warnings?: string[];
};

type StancReturnFailure = {
  errors: string[];
  result: undefined;
  warnings?: string[];
};

type StancReturn = StancReturnSuccess | StancReturnFailure;

type StancFunction = (
  filename: string,
  code: string,
  options: string[],
  includes?: Record<string, string>,
) => StancReturn;

const stancjs = require("./stanc.js");
const stanc: StancFunction = stancjs.stanc;

const stanc_version = stanc("", "", ["version"]).result;

export const compile = (getFileContentsFn: typeof getFileContents) => async(
  document: TextDocument,
  includedFilenamesAndPaths: Record<Filename, FilePath>,
  args: string[] = [],
): Promise<StancReturn> => {
  const lineLength = 78; // make this configurable

  const filename = fileURLToPath(document.uri);
  const code = document.getText();

  const filePathErrors = Object.values(includedFilenamesAndPaths).filter(
    isFilePathError,
  );
  if (filePathErrors.length > 0) {
    return {
      errors: filePathErrors,
      result: undefined,
    };
  }

  const includedFilenamesAndFileContents = await getFileContents(includedFilenamesAndPaths)
  
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
  return stanc(filename, code, stanc_args, includedFilenamesAndFileContents);
}

export function getMathSignatures(): string {
  return stancjs.dump_stan_math_signatures();
}

export function getMathDistributions(): string {
  return stancjs.dump_stan_math_distributions();
}

export default compile(getFileContents);
