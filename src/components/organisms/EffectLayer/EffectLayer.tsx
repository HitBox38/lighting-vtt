import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApplication, useTick } from "@pixi/react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Mesh as PixiMesh,
  Texture as PixiTexture,
  type MeshGeometry,
  type Renderer,
  type Shader,
} from "pixi.js";
import { toast } from "sonner";

import { useLightStore } from "@/stores/lightStore/lightStore";
import { useEffectRuntimeStore, type EffectInstanceStatus } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import { effectRefKey, useEffectDefinitions } from "@/lib/effects/hooks/useEffectDefinitions";
import { watchDeviceLoss } from "@/lib/effects/deviceLoss";
import {
  createEffectShader,
  effectCacheKey,
  effectRegistry,
  getEffectBackend,
  getEffectQuadGeometry,
  resetEffectQuadGeometry,
  type CompiledEffect,
  type EffectShaderHandle,
} from "@/lib/effects/effectRegistry";
import { packParamValues } from "@shared/effects";

import { drawEffectFallback } from "@/lib/effects/fallback";

interface Props {
  isGM?: boolean;
  /** The scene map, exposed to shaders as `uMap`. */
  mapTexture: PixiTexture | null;
}

/** What a node currently draws. Fallbacks are used whenever a real program is unavailable. */
type NodeMode = "mesh" | "fallback";

interface InstanceNode {
  mode: NodeMode;
  /** Cache key of the compiled program the mesh was built from; null for fallbacks. */
  programKey: string | null;
  /** Definition reference the node was built for; a version bump rebuilds the node. */
  refKey: string;
  mesh: PixiMesh<MeshGeometry, Shader> | null;
  handle: EffectShaderHandle | null;
  fallback: PixiGraphics | null;
}

/**
 * If the GPU context is lost within this window after an effect first drew,
 * that effect is the prime suspect and gets disabled. Heuristic, but the only
 * signal a browser gives us.
 */
const SUSPECT_WINDOW_MS = 5_000;

function destroyNode(node: InstanceNode): void {
  node.mesh?.destroy({ children: false, texture: false, textureSource: false });
  node.handle?.destroy();
  node.fallback?.destroy();
}

function statusFromCompiled(compiled: CompiledEffect): EffectInstanceStatus {
  switch (compiled.status) {
    case "ok":
      return { kind: "ok", warnings: compiled.warnings };
    case "missing-program":
      return { kind: "missing-program", backend: compiled.backend };
    case "error":
      return { kind: "error", diagnostics: compiled.diagnostics };
    default: {
      const exhaustive: never = compiled;
      throw new Error(`Unhandled compile status: ${String(exhaustive)}`);
    }
  }
}

export function EffectLayer({ isGM = true, mapTexture }: Props) {
  const { app, isInitialised } = useApplication();
  const effects = useLightStore((state) => state.effects);
  const sceneId = useLightStore((state) => state.sceneId);
  const disabled = useEffectRuntimeStore((state) => state.disabled);
  const setStatuses = useEffectRuntimeStore((state) => state.setStatuses);
  const setBackend = useEffectRuntimeStore((state) => state.setBackend);
  const disableInstance = useEffectRuntimeStore((state) => state.disableInstance);

  const visibleEffects = useMemo(
    () => (isGM ? effects : effects.filter((effect) => !effect.hidden)),
    [effects, isGM],
  );
  const { definitions, isLoading } = useEffectDefinitions(visibleEffects, sceneId);

  const [compiled, setCompiled] = useState<Map<string, CompiledEffect>>(() => new Map());
  /** Bumped after a context loss so every program is compiled again against the new device. */
  const [deviceEpoch, setDeviceEpoch] = useState(0);

  const containerRef = useRef<PixiContainer | null>(null);
  const nodesRef = useRef<Map<string, InstanceNode>>(new Map());
  // Set on the first tick; reading the clock during render is impure.
  const startTimeRef = useRef<number | null>(null);
  const lastActivatedRef = useRef<{ instanceId: string; at: number } | null>(null);

  const renderer: Renderer | null = isInitialised ? app.renderer : null;
  const backend = renderer ? getEffectBackend(renderer) : null;

  useEffect(() => {
    setBackend(backend);
  }, [backend, setBackend]);

  // -------------------------------------------------------------------------
  // Compile every distinct definition the visible instances pin
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!renderer || !backend) return;
    let cancelled = false;

    const wanted = new Set<string>();
    for (const instance of visibleEffects) {
      const definition = definitions.get(effectRefKey(instance.effectId, instance.version));
      if (!definition || definition.kind !== "shader") continue;
      const key = effectCacheKey(instance.effectId, instance.version, backend);
      if (wanted.has(key) || compiled.has(key)) continue;
      wanted.add(key);

      // Cached entries resolve in a microtask, i.e. before the next paint, so
      // there is no visible flash and no synchronous setState inside the effect.
      void effectRegistry.get(key, renderer, definition).then((result) => {
        if (cancelled) return;
        setCompiled((prev) => (prev.get(key) === result ? prev : new Map(prev).set(key, result)));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [renderer, backend, visibleEffects, definitions, compiled, deviceEpoch]);

  // -------------------------------------------------------------------------
  // Reconcile pixi nodes with store state
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !renderer || !backend) return;

    const nodes = nodesRef.current;
    const liveIds = new Set(visibleEffects.map((effect) => effect.id));
    for (const [id, node] of nodes) {
      if (!liveIds.has(id)) {
        destroyNode(node);
        nodes.delete(id);
      }
    }

    const statuses: Record<string, EffectInstanceStatus> = {};
    const mapSource = mapTexture?.source ?? PixiTexture.WHITE.source;
    const mapWidth = mapTexture?.width ?? 0;
    const mapHeight = mapTexture?.height ?? 0;

    visibleEffects.forEach((instance, index) => {
      const refKey = effectRefKey(instance.effectId, instance.version);
      const definition = definitions.get(refKey);
      const disabledReason = disabled[instance.id];

      let status: EffectInstanceStatus;
      let program: Extract<CompiledEffect, { status: "ok" }> | null = null;
      let programKey: string | null = null;

      if (definition && definition.kind !== "shader") {
        // Script effects are computed in the sandbox and drawn by LightingLayer,
        // which also publishes their status. Nothing to paint or report here.
        const stale = nodes.get(instance.id);
        if (stale) {
          destroyNode(stale);
          nodes.delete(instance.id);
        }
        return;
      }

      if (disabledReason) {
        status = { kind: "disabled", reason: disabledReason };
      } else if (!definition) {
        status = isLoading ? { kind: "loading" } : { kind: "missing-definition" };
      } else {
        programKey = effectCacheKey(instance.effectId, instance.version, backend);
        const result = compiled.get(programKey);
        if (!result) {
          status = { kind: "compiling" };
        } else {
          status = statusFromCompiled(result);
          if (result.status === "ok") program = result;
        }
      }
      statuses[instance.id] = status;

      const mode: NodeMode = program ? "mesh" : "fallback";
      const existing = nodes.get(instance.id);
      const reusable =
        existing !== undefined &&
        existing.mode === mode &&
        existing.refKey === refKey &&
        (mode === "fallback" || existing.programKey === programKey);

      let node: InstanceNode;
      if (reusable) {
        node = existing;
      } else {
        if (existing) {
          destroyNode(existing);
          nodes.delete(instance.id);
        }
        if (program) {
          const handle = createEffectShader(program, mapSource);
          const mesh = new PixiMesh({ geometry: getEffectQuadGeometry(), shader: handle.shader });
          mesh.eventMode = "none";
          container.addChild(mesh);
          node = { mode: "mesh", programKey, refKey, mesh, handle, fallback: null };
          lastActivatedRef.current = { instanceId: instance.id, at: performance.now() };
        } else {
          const fallback = new PixiGraphics();
          fallback.eventMode = "none";
          container.addChild(fallback);
          node = { mode: "fallback", programKey: null, refKey, mesh: null, handle: null, fallback };
        }
        nodes.set(instance.id, node);
      }

      if (node.mesh && node.handle && definition) {
        const mesh = node.mesh;
        mesh.position.set(instance.x, instance.y);
        mesh.rotation = instance.rotation;
        mesh.scale.set(instance.radius);
        mesh.blendMode = definition.blend;
        mesh.zIndex = index;
        node.handle.setMap(mapSource);

        const uniforms = node.handle.uniforms.uniforms;
        packParamValues(definition.params, instance.params, uniforms.uParams);
        uniforms.uCenter[0] = instance.x;
        uniforms.uCenter[1] = instance.y;
        uniforms.uMapSize[0] = mapWidth;
        uniforms.uMapSize[1] = mapHeight;
        uniforms.uRadius = instance.radius;
        uniforms.uRotation = instance.rotation;
        node.handle.uniforms.update();
      } else if (node.fallback) {
        const fallback = node.fallback;
        fallback.position.set(instance.x, instance.y);
        fallback.scale.set(1);
        fallback.zIndex = index;
        drawEffectFallback(fallback, definition, instance.params, status.kind === "ok" ? "compiling" : status.kind, instance.radius, isGM);
      }
    });

    container.sortChildren();
    setStatuses("shader", statuses);
  }, [visibleEffects, definitions, compiled, disabled, isLoading, isGM, mapTexture, renderer, backend, setStatuses]);

  // -------------------------------------------------------------------------
  // Animate: time and viewport are the only uniforms that change every frame
  // -------------------------------------------------------------------------
  useTick(() => {
    if (!renderer) return;
    const now = performance.now();
    if (startTimeRef.current === null) startTimeRef.current = now;
    const seconds = (now - startTimeRef.current) / 1000;
    const width = renderer.width;
    const height = renderer.height;
    for (const node of nodesRef.current.values()) {
      if (!node.handle) continue;
      const uniforms = node.handle.uniforms.uniforms;
      uniforms.uTime = seconds;
      uniforms.uViewport[0] = width;
      uniforms.uViewport[1] = height;
      node.handle.uniforms.update();
    }
  });

  // -------------------------------------------------------------------------
  // Context loss: drop every GPU object, blame the newest effect, recompile on restore
  // -------------------------------------------------------------------------
  const handleDeviceLost = useCallback(
    (detail: string) => {
      const suspect = lastActivatedRef.current;
      const now = performance.now();
      if (suspect && now - suspect.at < SUSPECT_WINDOW_MS) {
        disableInstance(suspect.instanceId, `Disabled after the GPU context was lost right after this effect started (${detail}).`);
        toast.error("An effect was disabled", {
          description: "The GPU context was lost right after it started rendering, so it was switched off for this session.",
        });
      } else {
        toast.warning("Graphics device lost", { description: "If the scene does not recover, reload it or switch to WebGL in settings." });
      }
      lastActivatedRef.current = null;

      for (const node of nodesRef.current.values()) destroyNode(node);
      nodesRef.current.clear();
      effectRegistry.clear();
      resetEffectQuadGeometry();
      setCompiled(new Map());
    },
    [disableInstance],
  );

  useEffect(() => {
    if (!renderer || !backend) return;
    return watchDeviceLoss(renderer, backend, {
      onLost: handleDeviceLost,
      // A fresh epoch recompiles every program against the new device.
      onRestored: () => setDeviceEpoch((epoch) => epoch + 1),
    });
  }, [renderer, backend, handleDeviceLost]);

  // Tear down every pixi object we created when the layer unmounts.
  useEffect(() => {
    const nodes = nodesRef.current;
    return () => {
      for (const node of nodes.values()) destroyNode(node);
      nodes.clear();
    };
  }, []);

  return <pixiContainer ref={containerRef} sortableChildren eventMode="none" />;
}
