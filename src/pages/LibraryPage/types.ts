export type SortOption =
  | "updated-newest"
  | "updated-oldest"
  | "created-newest"
  | "created-oldest"
  | "name-asc"
  | "name-desc";

export type ViewMode = "grid" | "list";

export interface Filters {
  hasLights: boolean;
  hasPresets: boolean;
}

export interface NewSceneFormData {
  name: string;
  imageUrl: string;
}
