/**
 * Standardized error types and helpers for MCP tool error responses.
 */

export class McpToolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "McpToolError";
  }
}

export class ApiAuthError extends McpToolError {
  constructor(service: string) {
    super(
      `Authentication failed for ${service}. Check your API credentials.`,
      "AUTH_ERROR",
      401,
    );
    this.name = "ApiAuthError";
  }
}

export class ApiRateLimitError extends McpToolError {
  constructor(
    service: string,
    public readonly retryAfterMs?: number,
  ) {
    super(
      `Rate limit exceeded for ${service}.${retryAfterMs ? ` Retry after ${Math.ceil(retryAfterMs / 1000)}s.` : ""}`,
      "RATE_LIMIT",
      429,
    );
    this.name = "ApiRateLimitError";
  }
}

export class ApiNotFoundError extends McpToolError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404);
    this.name = "ApiNotFoundError";
  }
}

export class ApiValidationError extends McpToolError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ApiValidationError";
  }
}

/** Format an error into an MCP tool error response. */
export function formatToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (error instanceof McpToolError) {
    return {
      content: [{ type: "text", text: `[${error.code}] ${error.message}` }],
      isError: true,
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return {
    content: [{ type: "text", text: `[ERROR] ${message}` }],
    isError: true,
  };
}

/** Wrap an async tool handler with standardized error handling. */
export function withErrorHandling<TArgs, TResult>(
  handler: (args: TArgs) => Promise<TResult>,
): (
  args: TArgs,
) => Promise<
  TResult | { content: Array<{ type: "text"; text: string }>; isError: true }
> {
  return async (args: TArgs) => {
    try {
      return await handler(args);
    } catch (error) {
      return formatToolError(error);
    }
  };
}
