import type { StancFunction } from "../types/common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stancjs = require("./stanc.js");
export const stanc: StancFunction = stancjs.stanc;

export function getMathSignatures(): string {
  return stancjs.dump_stan_math_signatures();
}

export function getMathDistributions(): string {
  return stancjs.dump_stan_math_distributions();
}
