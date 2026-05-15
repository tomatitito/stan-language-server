import { describe, expect, it } from "bun:test";
import {
  STAN_CONSTRAINT_NAMES,
  STAN_DATATYPES,
  STAN_DISTRIBUTIONS,
  STAN_FUNCTIONS,
  STAN_KEYWORDS,
  isReservedOrBuiltInStanName,
} from "../../../language/stan-symbols";

describe("stan symbol helpers", () => {
  it("identifies reserved and built-in Stan names", () => {
    expect(isReservedOrBuiltInStanName("real")).toBeTrue();
    expect(isReservedOrBuiltInStanName("lower")).toBeTrue();
    expect(isReservedOrBuiltInStanName("print")).toBeTrue();
    expect(isReservedOrBuiltInStanName("bernoulli")).toBeTrue();
    expect(isReservedOrBuiltInStanName("my_parameter")).toBeFalse();
  });
});
