import type { StancFunction } from "../../types/common";
import type { FormattingContext, FormattingOptions, FormattingResult } from "../../types/formatting";

// Import the Stan compiler
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stancjs = require("../../stanc/stanc.js");
const stanc: StancFunction = stancjs.stanc;

/**
 * Formats Stan code using the Stan compiler's auto-format capability
 * This is a pure function with no LSP dependencies
 */
export function provideFormatting(
  context: FormattingContext,
  options: FormattingOptions = {}
): FormattingResult {
  const {
    maxLineLength = 78,
    canonicalizeDeprecations = true,
    allowUndefined = true,
  } = options;

  // Build Stan compiler arguments
  const stanc_args = [
    "auto-format",
    `filename-in-msg=${context.filename}`,
    `max-line-length=${maxLineLength}`,
  ];

  if (canonicalizeDeprecations) {
    stanc_args.push("canonicalze=deprecations");
  }

  if (allowUndefined) {
    stanc_args.push("allow-undefined");
  }


  const result = stanc(
    context.filename,
    context.content,
    stanc_args,
    context.includes || {}
  );

  if (result.result) {
    return {
      success: true,
      formattedCode: result.result,
      warnings: result.warnings,
    };
  } else {
    return {
      success: false,
      errors: result.errors,
      warnings: result.warnings,
    };
  }
}