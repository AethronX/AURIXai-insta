import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger, newRequestId } from "@/lib/observability/logger";
import { AuthenticationError } from "@/lib/security/auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Wraps a route handler with structured error handling: known error types map to
 * sensible status codes, everything else is logged with a request ID and returned as a
 * sanitized 500 — internal error details never leak to the client.
 */
export function withRouteErrorHandling<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<NextResponse>
) {
  return async (request: Request, ...args: Args): Promise<NextResponse> => {
    const requestId = newRequestId();
    try {
      return await handler(request, ...args);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });
      }
      if (err instanceof ApiError) {
        return NextResponse.json({ ok: false, error: err.message, requestId }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: "Validation failed", issues: err.issues, requestId },
          { status: 400 }
        );
      }
      logger.error({ err, requestId, url: request.url }, "unhandled route error");
      return NextResponse.json(
        { ok: false, error: "Internal server error", requestId },
        { status: 500 }
      );
    }
  };
}
