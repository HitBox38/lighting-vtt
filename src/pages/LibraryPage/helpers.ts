import type { KeyboardEvent } from "react";
import type { NavigateFunction } from "react-router-dom";

import { setSceneEntrySource } from "@/lib/analytics";
import type { Filters, SortOption } from "./types";

export function openLibraryScene(navigate: NavigateFunction, sceneId: string) {
  setSceneEntrySource("library");
  navigate(`/scene?id=${encodeURIComponent(sceneId)}`);
}

export function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
export function handleActivateKey(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return new Date(timestamp).toLocaleDateString();
};

export const getSortComparator = (sortBy: SortOption) => {
  switch (sortBy) {
    case "updated-newest":
      return (a: { updatedAt: number }, b: { updatedAt: number }) => b.updatedAt - a.updatedAt;
    case "updated-oldest":
      return (a: { updatedAt: number }, b: { updatedAt: number }) => a.updatedAt - b.updatedAt;
    case "created-newest":
      return (a: { _creationTime: number }, b: { _creationTime: number }) =>
        b._creationTime - a._creationTime;
    case "created-oldest":
      return (a: { _creationTime: number }, b: { _creationTime: number }) =>
        a._creationTime - b._creationTime;
    case "name-asc":
      return (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    case "name-desc":
      return (a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name);
    default: {
      const _exhaustive: never = sortBy;
      return _exhaustive;
    }
  }
};

export function filterAndSortScenes<
  T extends {
    name: string;
    lights: unknown[];
    presets: unknown[];
    updatedAt: number;
    _creationTime: number;
  },
>(scenes: T[] | undefined, searchQuery: string, filters: Filters, sortBy: SortOption): T[] {
  if (!scenes) {
    return [];
  }

  let result = [...scenes];
  const trimmed = searchQuery.trim().toLowerCase();
  if (trimmed) {
    result = result.filter((scene) => scene.name.toLowerCase().includes(trimmed));
  }
  if (filters.hasLights) {
    result = result.filter((scene) => scene.lights.length > 0);
  }
  if (filters.hasPresets) {
    result = result.filter((scene) => scene.presets.length > 0);
  }
  result.sort(getSortComparator(sortBy));
  return result;
}
