import type { Doc } from "../../../convex/_generated/dataModel";
import type { EffectSort } from "@shared/effects";

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

export class EffectLibraryPresenter {
  static readonly pageSize = 24;

  static readonly cardGridClass =
    "grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 2xl:grid-cols-3";

  static sortFromParam(value: string | null): EffectSort {
    return value === "name" ? "name" : "newest";
  }

  static countLabel(count: number): string {
    return `${count} ${count === 1 ? "effect" : "effects"} shown`;
  }
}
