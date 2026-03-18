import type { SortOption } from "./types";

export const SORT_LABELS: Record<SortOption, string> = {
  "updated-newest": "Last edited",
  "updated-oldest": "Oldest edited",
  "created-newest": "Newest created",
  "created-oldest": "Oldest created",
  "name-asc": "Name A\u2013Z",
  "name-desc": "Name Z\u2013A",
} as const;

export const DEFAULT_FILTERS = {
  hasLights: false,
  hasPresets: false,
} as const;
