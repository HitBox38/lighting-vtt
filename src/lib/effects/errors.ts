import { ConvexError } from "convex/values";

/**
 * Turns a thrown Convex mutation error into something a user can read.
 *
 * Convex wraps server errors as
 * `[CONVEX M(effects:saveVersion)] [Request ID: …] Server Error\nUncaught Error: <message>\n  at …`.
 * Only `<message>` is meaningful to the user; the rest is noise in a toast.
 */
export function describeMutationError(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ConvexError && error.data && typeof error.data === "object") {
    if (error.data.kind === "RateLimited") return "Publishing allowance reached. Your version is saved; retry when the countdown ends.";
    if (typeof error.data.message === "string") return error.data.message;
  }
  if (!(error instanceof Error)) return fallback;
  const raw = error.message;
  const marker = "Uncaught Error: ";
  const start = raw.indexOf(marker);
  if (start !== -1) {
    const rest = raw.slice(start + marker.length);
    const end = rest.indexOf("\n");
    const message = (end === -1 ? rest : rest.slice(0, end)).trim();
    if (message.length > 0) return message;
  }
  const firstLine = raw.split("\n")[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine : fallback;
}

/** Structured transport data, never parsed from a server stack trace. */
export function mutationRetryAt(error: unknown, now = Date.now()): number | null {
  if (!(error instanceof ConvexError) || !error.data || typeof error.data !== "object") return null;
  return error.data.kind === "RateLimited" && typeof error.data.retryAfter === "number" && Number.isFinite(error.data.retryAfter)
    ? now + Math.max(0, error.data.retryAfter) : null;
}
