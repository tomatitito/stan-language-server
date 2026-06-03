import { dump_stan_math_distributions, dump_stan_math_signatures } from "stanc3";

export const STAN_KEYWORDS = [
  "for",
  "in",
  "while",
  "if",
  "then",
  "else",
  "break",
  "continue",
  "return",
  "functions",
  "data",
  "transformed",
  "parameters",
  "model",
  "generated",
  "quantities",
  "print",
  "reject",
  "fatal_error",
  "profile",
  "lower",
  "upper",
  "offset",
  "multiplier",
  "target",
  "jacobian",
] as const;

export const STAN_DATATYPES = [
  "void",
  "int",
  "real",
  "complex",
  "array",
  "tuple",
  "vector",
  "row_vector",
  "matrix",
  "complex_vector",
  "complex_row_vector",
  "complex_matrix",
  "ordered",
  "positive_ordered",
  "simplex",
  "unit_vector",
  "sum_to_zero_vector",
  "cholesky_factor_corr",
  "cholesky_factor_cov",
  "corr_matrix",
  "cov_matrix",
  "row_stochastic_matrix",
  "column_stochastic_matrix",
  "sum_to_zero_matrix",
] as const;

export const STAN_CONSTRAINT_NAMES = [
  "lower",
  "upper",
  "offset",
  "multiplier",
] as const;

export const STAN_HIGHER_ORDER_FUNCTIONS = [
  "algebra_solver",
  "algebra_solver_newton",
  "dae",
  "dae_tol",
  "integrate_1d",
  "integrate_ode",
  "integrate_ode_adams",
  "integrate_ode_bdf",
  "integrate_ode_rk45",
  "map_rect",
  "ode_adams",
  "ode_adams_tol",
  "ode_adjoint_tol_ctl",
  "ode_bdf",
  "ode_bdf_tol",
  "ode_ckrk",
  "ode_ckrk_tol",
  "ode_rk45",
  "ode_rk45_tol",
  "reduce_sum",
  "reduce_sum_static",
  "solve_newton",
  "solve_newton_tol",
  "solve_powell",
  "solve_powell_tol",
] as const;

export const STAN_MANUAL_FUNCTIONS = [
  ...STAN_HIGHER_ORDER_FUNCTIONS,
  "print",
  "reject",
  "fatal_error",
  "target",
] as const;

export const STAN_FUNCTIONS = [
  ...new Set([
    ...dump_stan_math_signatures()
      .split("\n")
      .map((line) => line.split("(", 1)[0]?.trim() ?? "")
      .filter((name) => name !== ""),
    ...STAN_MANUAL_FUNCTIONS,
  ]),
];

export const STAN_DISTRIBUTIONS = dump_stan_math_distributions()
  .split("\n")
  .map((line) => line.split(":")[0]?.trim() ?? "")
  .filter((name) => name !== "");

const STAN_RESERVED_OR_BUILTIN_NAMES = new Set<string>([
  ...STAN_KEYWORDS,
  ...STAN_DATATYPES,
  ...STAN_CONSTRAINT_NAMES,
  ...STAN_FUNCTIONS,
  ...STAN_DISTRIBUTIONS,
]);

const STAN_HIGHER_ORDER_FUNCTION_NAMES = new Set<string>(
  STAN_HIGHER_ORDER_FUNCTIONS,
);

export const isReservedOrBuiltInStanName = (name: string): boolean => {
  return STAN_RESERVED_OR_BUILTIN_NAMES.has(name);
};

export const isHigherOrderStanFunction = (name: string): boolean => {
  return STAN_HIGHER_ORDER_FUNCTION_NAMES.has(name);
};
