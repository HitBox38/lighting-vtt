import type { Doc } from "../../../convex/_generated/dataModel";

export function authorLabel(
  effect: Pick<Doc<"effects">, "authorName">,
  mine: boolean,
): string {
  if (mine) return "You";
  return effect.authorName ?? "Anonymous author";
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
