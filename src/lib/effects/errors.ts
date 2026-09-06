/**
 * Turns a thrown Convex mutation error into something a user can read.
 *
 * Convex wraps server errors as
 * `[CONVEX M(effects:saveVersion)] [Request ID: …] Server Error\nUncaught Error: <message>\n  at …`.
 * Only `<message>` is meaningful to the user; the rest is noise in a toast.
 */
export function describeMutationError(error: unknown, fallback = "Something went wrong"): string {
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
