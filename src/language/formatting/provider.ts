import { provideCompilation } from "../../stanc/provider";
import type { FormattingContext, FormattingResult } from "../../types/formatting";

export function provideFormatting(
  context: FormattingContext,
): FormattingResult {
  const result = provideCompilation(context.filename, context.content, [], context.includes || {})

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