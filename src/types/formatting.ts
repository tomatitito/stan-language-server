// Domain types for formatting functionality
// These types are independent of LSP protocol

export interface FormattingOptions {
  /** Maximum line length for formatted code */
  maxLineLength?: number;
  /** Whether to canonicalize deprecations */
  canonicalizeDeprecations?: boolean;
  /** Whether to allow undefined functions */
  allowUndefined?: boolean;
}

export interface FormattingResult {
  /** Whether formatting was successful */
  success: boolean;
  /** The formatted code if successful */
  formattedCode?: string;
  /** Error messages if formatting failed */
  errors?: string[];
  /** Warning messages from the formatter */
  warnings?: string[];
}

export interface FormattingContext {
  /** The filename being formatted */
  filename: string;
  /** The content to format */
  content: string;
  /** Include file contents */
  includes?: Record<string, string>;
}