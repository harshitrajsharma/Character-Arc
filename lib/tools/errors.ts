export type ToolActionErrorCode =
  | "INVALID_INPUT"
  | "NOT_AVAILABLE"
  | "FORBIDDEN"
  | "HANDLER_MISSING"
  | "RELEASE_MISMATCH"
  | "REVISION_CONFLICT"
  | "RUN_FAILED"
  | "FAILED"

/**
 * Shared tool-action execution error. Lives in a leaf module so handler
 * modules can be imported without creating an import cycle through
 * `execute-tool-action.ts`.
 */
export class ToolActionExecutionError extends Error {
  constructor(
    message: string,
    readonly code: ToolActionErrorCode
  ) {
    super(message)
    this.name = "ToolActionExecutionError"
  }
}
