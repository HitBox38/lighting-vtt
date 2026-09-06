import { create } from "zustand";

import type { EffectBackend } from "@/lib/effects/shaderContract";
import type { EffectDiagnostic } from "@/lib/effects/effectRegistry";

/**
 * Per-instance render status, published by EffectLayer and read by the
 * controls/context menu so the GM can see why an effect is a flat circle.
 * This is transient UI state: never persisted, never synced.
 */
export type EffectInstanceStatus =
  | { kind: "loading" }
  | { kind: "compiling" }
  | { kind: "ok"; warnings: EffectDiagnostic[] }
  | { kind: "missing-definition" }
  | { kind: "missing-program"; backend: EffectBackend }
  | { kind: "error"; diagnostics: EffectDiagnostic[] }
  | { kind: "disabled"; reason: string };

/** Who publishes a status: EffectLayer for shader instances, the script runtime for script instances. */
export type EffectStatusOwner = "shader" | "script";

interface EffectRuntimeState {
  backend: EffectBackend | null;
  /** Merged view of both owners, keyed by instance id. Read this; write through `setStatuses`. */
  statuses: Record<string, EffectInstanceStatus>;
  shaderStatuses: Record<string, EffectInstanceStatus>;
  scriptStatuses: Record<string, EffectInstanceStatus>;
  /** Instance ids disabled after a GPU context loss or a runtime failure. */
  disabled: Record<string, string>;
  setBackend: (backend: EffectBackend | null) => void;
  /** Replace every status an owner publishes. Instances the owner no longer lists are dropped. */
  setStatuses: (owner: EffectStatusOwner, next: Record<string, EffectInstanceStatus>) => void;
  disableInstance: (instanceId: string, reason: string) => void;
  enableInstance: (instanceId: string) => void;
  clearDisabled: () => void;
}

function statusesEqual(a: EffectInstanceStatus, b: EffectInstanceStatus): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "loading":
    case "compiling":
    case "missing-definition":
      return true;
    case "ok":
      return b.kind === "ok" && a.warnings === b.warnings;
    case "missing-program":
      return b.kind === "missing-program" && a.backend === b.backend;
    case "error":
      return b.kind === "error" && a.diagnostics === b.diagnostics;
    case "disabled":
      return b.kind === "disabled" && a.reason === b.reason;
    default: {
      const exhaustive: never = a;
      throw new Error(`Unhandled status: ${String(exhaustive)}`);
    }
  }
}

function recordsEqual(current: Record<string, EffectInstanceStatus>, next: Record<string, EffectInstanceStatus>): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  return currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] && statusesEqual(current[key], next[key]));
}

export const useEffectRuntimeStore = create<EffectRuntimeState>((set, get) => ({
  backend: null,
  statuses: {},
  shaderStatuses: {},
  scriptStatuses: {},
  disabled: {},
  setBackend: (backend) => {
    if (get().backend !== backend) set({ backend });
  },
  setStatuses: (owner, next) => {
    const state = get();
    switch (owner) {
      case "shader":
        if (recordsEqual(state.shaderStatuses, next)) return;
        set({ shaderStatuses: next, statuses: { ...state.scriptStatuses, ...next } });
        return;
      case "script":
        if (recordsEqual(state.scriptStatuses, next)) return;
        set({ scriptStatuses: next, statuses: { ...state.shaderStatuses, ...next } });
        return;
      default: {
        const exhaustive: never = owner;
        throw new Error(`Unhandled status owner: ${String(exhaustive)}`);
      }
    }
  },
  disableInstance: (instanceId, reason) =>
    set((state) => ({ disabled: { ...state.disabled, [instanceId]: reason } })),
  enableInstance: (instanceId) =>
    set((state) => {
      if (!(instanceId in state.disabled)) return state;
      const disabled = { ...state.disabled };
      delete disabled[instanceId];
      return { disabled };
    }),
  clearDisabled: () => set({ disabled: {} }),
}));
