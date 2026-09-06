import { useEffect, useMemo, useRef, useState } from "react";

import type { Light, Mirror } from "@shared/index";
import { coerceParamValues, type EffectDefinition, type EffectInstance } from "@shared/effects";

import { effectRefKey } from "@/lib/effects/hooks/useEffectDefinitions";
import type { GeometryOutput } from "@/lib/geometry";
import { buildScriptInput, type ScriptEffectInput } from "@/lib/effects/scriptContract";
import { getScriptSandbox, sceneModuleId } from "@/lib/effects/scriptRuntime";
import { useEffectRuntimeStore, type EffectInstanceStatus } from "@/stores/effectRuntimeStore/effectRuntimeStore";

/**
 * Per-instance bookkeeping. One compute runs at a time per instance; inputs
 * that arrive meanwhile only mark the slot dirty, so a light being dragged
 * costs at most one queued compute instead of one per pointer event.
 */
interface Slot {
  moduleId: string;
  source: string;
  input: ScriptEffectInput;
  /** Structural identity of `(moduleId, source, input)`; equal keys need no recompute. */
  inputKey: string;
  inFlight: boolean;
  dirty: boolean;
}

interface ScriptTarget {
  instance: EffectInstance;
  definition: EffectDefinition;
  source: string;
}

function isScriptTarget(value: ScriptTarget | null): value is ScriptTarget {
  return value !== null;
}

/**
 * Runs every `kind: "script"` instance through the sandbox and returns their
 * lit geometry keyed by instance id, for LightingLayer to cut into the
 * darkness mask. Publishes per-instance status under the `"script"` owner so
 * the context menu can explain a silent effect.
 *
 * Instances whose definition has not resolved yet are not touched here;
 * EffectLayer reports those as loading.
 */
export function useScriptEffects(
  instances: readonly EffectInstance[],
  definitions: ReadonlyMap<string, EffectDefinition>,
  lights: readonly Light[],
  mirrors: readonly Mirror[],
): ReadonlyMap<string, GeometryOutput> {
  const disabled = useEffectRuntimeStore((state) => state.disabled);
  const setStatuses = useEffectRuntimeStore((state) => state.setStatuses);

  const [geometry, setGeometry] = useState<ReadonlyMap<string, GeometryOutput>>(() => new Map());
  const slotsRef = useRef(new Map<string, Slot>());
  const statusesRef = useRef<Record<string, EffectInstanceStatus>>({});
  /** Scene module ids this hook loaded. Tracked here so the editor preview's modules are never unloaded from under it. */
  const loadedRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const targets = useMemo<ScriptTarget[]>(
    () =>
      instances
        .map((instance): ScriptTarget | null => {
          const definition = definitions.get(effectRefKey(instance.effectId, instance.version));
          if (!definition || definition.kind !== "script") return null;
          return { instance, definition, source: definition.script ?? "" };
        })
        .filter(isScriptTarget),
    [instances, definitions],
  );

  useEffect(() => {
    const sandbox = getScriptSandbox();
    const slots = slotsRef.current;
    const nextStatuses: Record<string, EffectInstanceStatus> = {};
    const liveIds = new Set<string>();

    const publishStatus = (instanceId: string, status: EffectInstanceStatus) => {
      if (!mountedRef.current || !slots.has(instanceId)) return;
      statusesRef.current = { ...statusesRef.current, [instanceId]: status };
      setStatuses("script", statusesRef.current);
    };

    const publishGeometry = (instanceId: string, output: GeometryOutput | null) => {
      if (!mountedRef.current) return;
      setGeometry((current) => {
        if (output === null && !current.has(instanceId)) return current;
        const next = new Map(current);
        if (output === null) next.delete(instanceId);
        else next.set(instanceId, output);
        return next;
      });
    };

    const run = async (instanceId: string): Promise<void> => {
      const slot = slots.get(instanceId);
      if (!slot) return;
      slot.inFlight = true;
      slot.dirty = false;
      const { moduleId, source, input } = slot;

      const loaded = await sandbox.load(moduleId, source);
      if (!mountedRef.current || slots.get(instanceId) !== slot) return;

      if (loaded.status === "error") {
        publishGeometry(instanceId, null);
        publishStatus(instanceId, { kind: "error", diagnostics: loaded.diagnostics });
      } else {
        const result = await sandbox.compute(moduleId, input);
        if (!mountedRef.current || slots.get(instanceId) !== slot) return;
        switch (result.status) {
          case "ok":
            publishGeometry(instanceId, result.geometry);
            publishStatus(instanceId, { kind: "ok", warnings: result.warnings });
            break;
          case "error":
            publishGeometry(instanceId, null);
            publishStatus(instanceId, { kind: "error", diagnostics: result.diagnostics });
            break;
          default: {
            const exhaustive: never = result;
            throw new Error(`Unhandled compute result: ${String(exhaustive)}`);
          }
        }
      }

      slot.inFlight = false;
      if (slot.dirty) void run(instanceId);
    };

    for (const { instance, definition, source } of targets) {
      const id = instance.id;
      liveIds.add(id);
      const disabledReason = disabled[id];
      if (disabledReason) {
        slots.delete(id);
        nextStatuses[id] = { kind: "disabled", reason: disabledReason };
        continue;
      }

      const moduleId = sceneModuleId(instance.effectId, instance.version);
      const params = coerceParamValues(definition.params, instance.params);
      const input = buildScriptInput(instance, params, lights, mirrors);
      const inputKey = `${moduleId}\u0000${source.length}\u0000${JSON.stringify(input)}`;

      const existing = slots.get(id);
      if (existing && existing.inputKey === inputKey && existing.source === source) {
        nextStatuses[id] = statusesRef.current[id] ?? { kind: "compiling" };
        continue;
      }

      if (existing) {
        existing.moduleId = moduleId;
        existing.source = source;
        existing.input = input;
        existing.inputKey = inputKey;
        nextStatuses[id] = statusesRef.current[id] ?? { kind: "compiling" };
        if (existing.inFlight) {
          existing.dirty = true;
        } else {
          void run(id);
        }
      } else {
        slots.set(id, { moduleId, source, input, inputKey, inFlight: false, dirty: false });
        nextStatuses[id] = { kind: "compiling" };
        void run(id);
      }
    }

    // Forget instances that left the scene and release modules nothing pins anymore.
    for (const id of Array.from(slots.keys())) {
      if (!liveIds.has(id)) slots.delete(id);
    }
    const pinned = new Set<string>();
    for (const slot of slots.values()) pinned.add(slot.moduleId);
    const loaded = loadedRef.current;
    for (const moduleId of pinned) loaded.add(moduleId);
    for (const moduleId of Array.from(loaded)) {
      if (pinned.has(moduleId)) continue;
      sandbox.unload(moduleId);
      loaded.delete(moduleId);
    }

    statusesRef.current = nextStatuses;
    setStatuses("script", nextStatuses);
  }, [targets, lights, mirrors, disabled, setStatuses]);

  useEffect(() => {
    mountedRef.current = true;
    // These maps live for the whole hook; the cleanup wants the same instances the effects filled.
    const loaded = loadedRef.current;
    const slots = slotsRef.current;
    return () => {
      mountedRef.current = false;
      const sandbox = getScriptSandbox();
      for (const moduleId of loaded) sandbox.unload(moduleId);
      loaded.clear();
      slots.clear();
      statusesRef.current = {};
      setStatuses("script", {});
    };
  }, [setStatuses]);

  // Geometry lags a compute behind; never hand out shapes for instances that are gone or disabled.
  return useMemo(() => {
    const live = new Set<string>();
    for (const { instance } of targets) {
      if (!disabled[instance.id]) live.add(instance.id);
    }
    const out = new Map<string, GeometryOutput>();
    for (const [id, output] of geometry) {
      if (live.has(id)) out.set(id, output);
    }
    return out;
  }, [geometry, targets, disabled]);
}
