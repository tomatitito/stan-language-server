import type { StancFunction, StancReturn } from "../types/common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stancjs = require("./stanc.js");
const stanc: StancFunction = stancjs.stanc;

export const provideCompilation = (
  filename: string,
  code: string,
  args: string[],
  includes: Record<string, string>,
): StancReturn => {
  const linelength = 78;
  const stanc_args = [
    "auto-format",
    `filename-in-msg=${filename}`,
    `max-line-length=${linelength}`,
    "canonicalze=deprecations",
    "allow-undefined",
    ...args,
  ];
  if (filename.endsWith(".stanfunctions")) {
    stanc_args.push("functions-only");
  }

  return stanc(filename, code, stanc_args, includes);
};
