import { useEffect, useRef, useState } from "react";
import {
  Application as PixiApplication,
  Graphics as PixiGraphics,
  Mesh as PixiMesh,
  Texture as PixiTexture,
  type MeshGeometry,
  type Renderer,
  type Shader,
  type WebGPURenderer,
} from "pixi.js";

import { watchDeviceLoss } from "@/lib/effects/deviceLoss";
import {
  backendLanguage,
  createEffectShader,
  effectRegistry,
  getEffectBackend,
  getEffectQuadGeometry,
  previewCacheKey,
  type CompiledEffect,
  type EffectShaderHandle,
} from "@/lib/effects/effectRegistry";
import type { EffectDiagnostic } from "@/lib/effects/diagnostics";
import type { GeometryOutput } from "@/lib/geometry";
import { buildScriptInput } from "@/lib/effects/scriptContract";
import { getScriptSandbox } from "@/lib/effects/scriptRuntime";
import type { EffectBackend } from "@/lib/effects/shaderContract";
import type { Light, Mirror } from "@shared/index";
import {
  coerceParamValues,
  hexToRgba,
  packParamValues,
  type EffectDefinition,
  type EffectInstance,
  type EffectParamValues,
} from "@shared/effects";
import { cn } from "@/lib/utils";

/** Outcome of running a script draft against the synthetic preview scene. */
export type ScriptPreviewResult =
  | { status: "ok"; warnings: EffectDiagnostic[]; elapsedMs: number }
  | { status: "error"; diagnostics: EffectDiagnostic[] };

export interface PreviewHandle {
  capture: () => Promise<Blob | null>;
}
interface Props {
  preference?: "webgl" | "webgpu";
  captureRef?: { current: PreviewHandle | null };
  paused?: boolean;
  enabled?: boolean;
  restart?: number;
  environment?: "grid" | "room" | "lights";
  sample?: { lightX: number; lightY: number; mirrorX: number; mirrorY: number };
  /** Null while the caller has nothing compilable yet (e.g. loading). */
  definition: EffectDefinition | null;
  params: EffectParamValues;
  /** Fires after every shader compile, including failures, so the caller can show diagnostics. */
  onCompiled?: (result: CompiledEffect, backend: EffectBackend) => void;
  /** Fires after every script run, including failures. */
  onScript?: (result: ScriptPreviewResult) => void;
  /** Fires once the renderer exists so the caller can show a backend badge. */
  onBackend?: (backend: EffectBackend) => void;
  /** Effect radius as a fraction of the shorter canvas edge. */
  radiusFraction?: number;
  className?: string;
}

const GRID_STEP = 32;
const GRID_COLOR = 0x51483e;
const BACKGROUND = 0x1b1916;
const DEFAULT_RADIUS_FRACTION = 0.38;

/**
 * Script previews run in a fixed virtual map so a script sees stable, table-like
 * pixel coordinates regardless of the canvas size; the layer is scaled to fit.
 */
const SCRIPT_SCENE_SIZE = 1000;
const SCRIPT_LIT_COLOR = 0xfff3c4;
const SCRIPT_MIRROR_COLOR = 0x67e8f9;
const SCRIPT_SEGMENT_THICKNESS = 8;

interface SyntheticScene {
  instance: EffectInstance;
  lights: Light[];
  mirrors: Mirror[];
}

/** A small scene with one of each light type and a mirror, so `compute` has something to react to. */
function syntheticScene(radius: number): SyntheticScene {
  const c = SCRIPT_SCENE_SIZE / 2;
  const flags = { locked: false, hidden: false };
  const instance: EffectInstance = {
    id: "preview-effect",
    effectId: "preview",
    version: 1,
    x: c,
    y: c,
    radius,
    rotation: 0,
    params: {},
  };
  const lights: Light[] = [
    {
      ...flags,
      id: "preview-radial",
      type: "radial",
      x: c - radius * 0.85,
      y: c - radius * 0.6,
      radius: radius * 0.45,
      color: "#ffb347",
      intensity: 1,
    },
    {
      ...flags,
      id: "preview-conic",
      type: "conic",
      x: c + radius * 0.9,
      y: c - radius * 0.5,
      radius: radius * 0.8,
      color: "#7dd3fc",
      intensity: 1,
      coneAngle: 50,
      targetX: c,
      targetY: c,
    },
    {
      ...flags,
      id: "preview-line",
      type: "line",
      x: c - radius * 0.6,
      y: c + radius * 0.85,
      radius: 6,
      color: "#f9a8d4",
      intensity: 1,
      targetX: c + radius * 0.6,
      targetY: c + radius * 0.85,
    },
  ];
  const mirrors: Mirror[] = [
    {
      ...flags,
      fixedWidth: false,
      id: "preview-mirror",
      x1: c + radius * 0.4,
      y1: c + radius * 0.2,
      x2: c + radius * 0.95,
      y2: c + radius * 0.7,
    },
  ];
  return { instance, lights, mirrors };
}

function hexToInt(hex: string): number {
  const [r, g, b] = hexToRgba(hex);
  return (
    (Math.round(r * 255) << 16) |
    (Math.round(g * 255) << 8) |
    Math.round(b * 255)
  );
}

/** Draws the synthetic inputs faintly, then the script's output on top. */
function drawScriptScene(
  graphics: PixiGraphics,
  scene: SyntheticScene,
  output: GeometryOutput | null,
  failed: boolean,
  inputs = false,
): void {
  graphics.clear();
  const { instance, lights, mirrors } = scene;

  if (failed)
    graphics
      .circle(instance.x, instance.y, instance.radius)
      .stroke({ width: 2, color: 0xef4444, alpha: 0.6 });

  for (const light of inputs ? lights : []) {
    const color = hexToInt(light.color);
    switch (light.type) {
      case "radial":
        graphics
          .circle(light.x, light.y, light.radius)
          .stroke({ width: 1.5, color, alpha: 0.35 });
        break;
      case "conic": {
        const base = Math.atan2(
          light.targetY - light.y,
          light.targetX - light.x,
        );
        const half = (light.coneAngle * Math.PI) / 360;
        graphics
          .moveTo(light.x, light.y)
          .arc(light.x, light.y, light.radius, base - half, base + half)
          .lineTo(light.x, light.y)
          .stroke({ width: 1.5, color, alpha: 0.35 });
        break;
      }
      case "line":
        graphics
          .moveTo(light.x, light.y)
          .lineTo(light.targetX, light.targetY)
          .stroke({ width: 3, color, alpha: 0.35 });
        break;
      default: {
        const exhaustive: never = light;
        throw new Error(`Unhandled light type: ${JSON.stringify(exhaustive)}`);
      }
    }
    graphics.circle(light.x, light.y, 6).fill({ color, alpha: 0.9 });
  }
  for (const mirror of inputs ? mirrors : []) {
    graphics
      .moveTo(mirror.x1, mirror.y1)
      .lineTo(mirror.x2, mirror.y2)
      .stroke({ width: 4, color: SCRIPT_MIRROR_COLOR, alpha: 0.8 });
  }

  if (!output) return;
  for (const polygon of output.polygons) {
    if (polygon.length < 3) continue;
    graphics.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++)
      graphics.lineTo(polygon[i].x, polygon[i].y);
    graphics.lineTo(polygon[0].x, polygon[0].y);
    graphics.fill({ color: SCRIPT_LIT_COLOR, alpha: 0.35 });
  }
  for (const segment of output.segments) {
    graphics
      .moveTo(segment.start.x, segment.start.y)
      .lineTo(segment.end.x, segment.end.y);
    graphics.stroke({
      width: SCRIPT_SEGMENT_THICKNESS,
      color: SCRIPT_LIT_COLOR,
      alpha: 0.6,
      cap: "round",
    });
  }
}

interface Stage {
  app: PixiApplication;
  renderer: Renderer;
  backend: EffectBackend;
  backdrop: PixiGraphics;
  sampleLayer: PixiGraphics;
  fallback: PixiGraphics;
  /** Script previews draw here in `SCRIPT_SCENE_SIZE` units; the tick scales it to the canvas. */
  scriptLayer: PixiGraphics;
  /** Sandbox module id for this preview instance; unloaded on unmount. */
  scriptModuleId: string;
  mesh: PixiMesh<MeshGeometry, Shader> | null;
  handle: EffectShaderHandle | null;
  programKey: string | null;
  startedAt: number;
  /**
   * Set by the boot effect's cleanup before `app.destroy`. React runs unmount
   * cleanups in declaration order, so later effects see a dead application
   * (`app.ticker` is null after destroy) and must not touch it.
   */
  disposed: boolean;
  deviceLost: boolean;
}

function drawBackdrop(
  graphics: PixiGraphics,
  width: number,
  height: number,
  environment: "grid" | "room" | "lights" = "grid",
): void {
  graphics.clear();
  if (environment === "room") {
    graphics.rect(0, 0, width, height).fill(0x100f0d);
    graphics
      .roundRect(width * 0.07, height * 0.08, width * 0.86, height * 0.84, 3)
      .fill(0x29251f)
      .stroke({ color: 0x6b5c47, width: 3 });
    graphics
      .rect(width * 0.2, height * 0.3, width * 0.15, height * 0.3)
      .fill(0x3b3328);
    graphics
      .rect(width * 0.67, height * 0.16, width * 0.13, height * 0.18)
      .fill(0x3b3328);
    for (let y = height * 0.1; y < height * 0.9; y += 24)
      graphics
        .moveTo(width * 0.08, y)
        .lineTo(width * 0.92, y)
        .stroke({ color: 0x51483e, width: 1, alpha: 0.2 });
    return;
  }
  graphics.rect(0, 0, width, height).fill({ color: BACKGROUND });
  graphics.setStrokeStyle({ width: 1, color: GRID_COLOR, alpha: 0.6 });
  for (let x = GRID_STEP; x < width; x += GRID_STEP) {
    graphics.moveTo(x, 0).lineTo(x, height);
  }
  for (let y = GRID_STEP; y < height; y += GRID_STEP) {
    graphics.moveTo(0, y).lineTo(width, y);
  }
  graphics.stroke();
}

function fallbackColor(
  definition: EffectDefinition | null,
  params: EffectParamValues,
): number {
  const colorParam = definition?.params.find((param) => param.type === "color");
  if (!colorParam) return 0xffffff;
  const raw = params[colorParam.key];
  const [r, g, b] = hexToRgba(
    typeof raw === "string" ? raw : colorParam.default,
  );
  return (
    (Math.round(r * 255) << 16) |
    (Math.round(g * 255) << 8) |
    Math.round(b * 255)
  );
}

function dropMesh(stage: Stage): void {
  stage.mesh?.destroy({
    children: false,
    texture: false,
    textureSource: false,
  });
  stage.handle?.destroy();
  stage.mesh = null;
  stage.handle = null;
  stage.programKey = null;
}

function destroyPreviewApp(app: PixiApplication): void {
  // Each preview requests its own device. Pixi disposes its resources but leaves
  // the device alive; release it explicitly across kind/renderer changes.
  const device = getEffectBackend(app.renderer) === "webgpu"
    ? (app.renderer as WebGPURenderer).gpu.device
    : null;
  app.destroy(true, { children: true });
  device?.destroy();
}

/** What the author sees in the diagnostics panel when their shader took the GPU down. */
function deviceLostResult(
  backend: EffectBackend,
  detail: string,
): CompiledEffect {
  return {
    status: "error",
    backend,
    diagnostics: [
      {
        severity: "error",
        line: null,
        language: backendLanguage(backend),
        message: `Graphics device lost (${detail}). Restart the preview or choose another renderer. This can happen because of the shader, graphics driver, or browser resource limits.`,
      },
    ],
  };
}

/**
 * A self-contained pixi canvas that renders one instance of `definition` on a
 * neutral grid. It shares the registry and the uniform contract with
 * EffectLayer, so what an author sees here is what the table renders.
 */
export function EffectPreview({
  definition,
  params,
  preference = "webgl",
  captureRef,
  paused = false,
  enabled = true,
  restart = 0,
  environment = "grid",
  sample,
  onCompiled,
  onScript,
  onBackend,
  radiusFraction = DEFAULT_RADIUS_FRACTION,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [stageReady, setStageReady] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  const environmentRef = useRef(environment);
  environmentRef.current = environment;
  const [compiled, setCompiled] = useState<{
    key: string;
    result: CompiledEffect;
  } | null>(null);
  const onCompiledRef = useRef(onCompiled);
  const onScriptRef = useRef(onScript);
  const onBackendRef = useRef(onBackend);
  onCompiledRef.current = onCompiled;
  onScriptRef.current = onScript;
  onBackendRef.current = onBackend;
  const isScript = definition?.kind === "script";
  const clockRef = useRef({ seconds: 0, last: 0 });
  useEffect(() => {
    clockRef.current = { seconds: 0, last: 0 };
  }, [restart]);
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = {
      capture: async () => {
        const stage = stageRef.current;
        if (!stage) return null;
        const width = stage.renderer.width / stage.renderer.resolution;
        const height = stage.renderer.height / stage.renderer.resolution;
        const guidesVisible = stage.sampleLayer.visible;
        const visibility = {
          mesh: stage.mesh?.visible,
          script: stage.scriptLayer.visible,
          fallback: stage.fallback.visible,
        };
        try {
          drawBackdrop(stage.backdrop, width, height);
          stage.sampleLayer.visible = false;
          if (stage.mesh) stage.mesh.visible = true;
          stage.scriptLayer.visible = Boolean(isScript);
          stage.fallback.visible = !isScript && !stage.mesh;
          const canvas = stage.renderer.extract.canvas({
            target: stage.app.stage,
          }) as HTMLCanvasElement;
          return await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
        } catch {
          return null;
        } finally {
          drawBackdrop(stage.backdrop, width, height, environmentRef.current);
          stage.sampleLayer.visible = guidesVisible;
          if (stage.mesh) stage.mesh.visible = visibility.mesh ?? true;
          stage.scriptLayer.visible = visibility.script;
          stage.fallback.visible = visibility.fallback;
        }
      },
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, isScript]);

  // ---------------------------------------------------------------------------
  // Boot / tear down the pixi application once per mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let visible = true;
    const updateActivity = () => {
      const stage = stageRef.current;
      if (!stage || stage.disposed || stage.deviceLost) return;
      if (visible && document.visibilityState !== "hidden")
        stage.app.ticker.start();
      else stage.app.ticker.stop();
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", updateActivity);
    const app = new PixiApplication();
    const resizeObserver = new ResizeObserver(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const { clientWidth, clientHeight } = host;
      if (clientWidth === 0 || clientHeight === 0) return;
      stage.renderer.resize(clientWidth, clientHeight);
      drawBackdrop(
        stage.backdrop,
        clientWidth,
        clientHeight,
        environmentRef.current,
      );
    });

    void app
      .init({
        preference,
        resizeTo: host,
        backgroundColor: BACKGROUND,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
      .then(() => {
        if (disposed) {
          destroyPreviewApp(app);
          return;
        }
        host.appendChild(app.canvas);
        app.ticker.maxFPS = 60;
        const backdrop = new PixiGraphics();
        backdrop.eventMode = "none";
        const fallback = new PixiGraphics();
        fallback.eventMode = "none";
        const scriptLayer = new PixiGraphics();
        const sampleLayer = new PixiGraphics();
        sampleLayer.eventMode = "none";
        scriptLayer.eventMode = "none";
        scriptLayer.visible = false;
        app.stage.addChild(backdrop, sampleLayer, fallback, scriptLayer);
        drawBackdrop(backdrop, host.clientWidth, host.clientHeight);

        const backend = getEffectBackend(app.renderer);
        stageRef.current = {
          app,
          renderer: app.renderer,
          backend,
          backdrop,
          sampleLayer,
          fallback,
          scriptLayer,
          scriptModuleId: `preview:${crypto.randomUUID()}`,
          mesh: null,
          handle: null,
          programKey: null,
          startedAt: performance.now(),
          disposed: false,
          deviceLost: false,
        };
        resizeObserver.observe(host);
        updateActivity();
        onBackendRef.current?.(backend);
        setStageReady((n) => n + 1);
      })
      .catch((error: unknown) => {
        console.error("Effect preview failed to start", error);
        if (!disposed)
          setBootError(
            "The graphics preview could not start. Reload to retry, or try a browser with hardware acceleration.",
          );
      });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage) {
        stage.disposed = true;
        dropMesh(stage);
        getScriptSandbox().unload(stage.scriptModuleId);
        destroyPreviewApp(stage.app);
      }
      // Unsaved drafts are keyed by source hash; nothing else will ever ask for them again.
      effectRegistry.clearPreviews();
    };
  }, [preference]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    drawBackdrop(
      stage.backdrop,
      stage.renderer.width / stage.renderer.resolution,
      stage.renderer.height / stage.renderer.resolution,
      environment,
    );
    const scene = syntheticScene(SCRIPT_SCENE_SIZE * radiusFraction);
    if (sample) {
      scene.lights[0].x = sample.lightX;
      scene.lights[0].y = sample.lightY;
      scene.mirrors[0].x2 = sample.mirrorX;
      scene.mirrors[0].y2 = sample.mirrorY;
    }
    drawScriptScene(stage.sampleLayer, scene, null, false, true);
    stage.sampleLayer.visible = environment === "lights";
  }, [environment, sample, stageReady, radiusFraction]);

  // ---------------------------------------------------------------------------
  // GPU loss: the author's draft is the most likely culprit, so say so
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    return watchDeviceLoss(stage.renderer, stage.backend, {
      onLost: (detail) => {
        stage.deviceLost = true;
        stage.app.ticker.stop();
        dropMesh(stage);
        // Every cached preview program was compiled against the dead device.
        effectRegistry.clearPreviews();
        const result = deviceLostResult(stage.backend, detail);
        setCompiled({ key: `lost:${detail}:${performance.now()}`, result });
        onCompiledRef.current?.(result, stage.backend);
        if (stage.backend === "webgpu")
          setBootError(
            "WebGPU device lost. Use Restart preview to try a fresh device, or select WebGL.",
          );
      },
      // Bumping stageReady re-runs the compile effect against the new device.
      onRestored: () => {
        stage.deviceLost = false;
        stage.app.ticker.start();
        setStageReady((n) => n + 1);
      },
    });
  }, [stageReady]);

  // ---------------------------------------------------------------------------
  // Compile whenever the program sources change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !definition || definition.kind !== "shader") {
      setCompiled(null);
      return;
    }
    const key = previewCacheKey(definition, stage.backend);
    let cancelled = false;

    void effectRegistry.get(key, stage.renderer, definition).then((result) => {
      if (cancelled) return;
      setCompiled({ key, result });
      onCompiledRef.current?.(result, stage.backend);
    });

    return () => {
      cancelled = true;
    };
    // Recompile only when a program source changes; params/name edits reuse the program.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageReady, definition?.kind, definition?.wgsl, definition?.glsl]);

  // ---------------------------------------------------------------------------
  // Script drafts: load into the sandbox and run against the synthetic scene
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !definition || definition.kind !== "script") {
      if (stage) stage.scriptLayer.visible = false;
      return;
    }
    const layer = stage.scriptLayer;
    layer.visible = true;
    const scene = syntheticScene(SCRIPT_SCENE_SIZE * radiusFraction);
    if (sample) {
      scene.lights[0].x = sample.lightX;
      scene.lights[0].y = sample.lightY;
      scene.mirrors[0].x2 = sample.mirrorX;
      scene.mirrors[0].y2 = sample.mirrorY;
    }
    const values = coerceParamValues(definition.params, params);
    const input = buildScriptInput(
      scene.instance,
      values,
      scene.lights,
      scene.mirrors,
    );
    const sandbox = getScriptSandbox();
    let cancelled = false;

    // Keep the last frame while the new run is in flight; flicker helps nobody.
    void (async () => {
      const loaded = await sandbox.load(
        stage.scriptModuleId,
        definition.script ?? "",
      );
      if (cancelled || stage.disposed) return;
      if (loaded.status === "error") {
        drawScriptScene(layer, scene, null, true);
        onScriptRef.current?.({
          status: "error",
          diagnostics: loaded.diagnostics,
        });
        return;
      }
      const result = await sandbox.compute(stage.scriptModuleId, input);
      if (cancelled || stage.disposed) return;
      switch (result.status) {
        case "ok":
          drawScriptScene(layer, scene, result.geometry, false);
          onScriptRef.current?.({
            status: "ok",
            warnings: result.warnings,
            elapsedMs: result.elapsedMs,
          });
          return;
        case "error":
          drawScriptScene(layer, scene, null, true);
          onScriptRef.current?.({
            status: "error",
            diagnostics: result.diagnostics,
          });
          return;
        default: {
          const exhaustive: never = result;
          throw new Error(`Unhandled compute result: ${String(exhaustive)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when the script, its params or the scene geometry changes; name/description edits do not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stageReady,
    definition?.kind,
    definition?.script,
    definition?.params,
    params,
    radiusFraction,
    sample,
  ]);

  // ---------------------------------------------------------------------------
  // Swap the mesh when the compiled program changes; push params every render
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let program: Extract<CompiledEffect, { status: "ok" }> | null = null;
    let programKey: string | null = null;
    if (compiled && compiled.result.status === "ok") {
      program = compiled.result;
      programKey = compiled.key;
    }

    if (stage.programKey !== programKey) {
      dropMesh(stage);
      if (program) {
        const handle = createEffectShader(program, PixiTexture.WHITE.source);
        const mesh = new PixiMesh({
          geometry: getEffectQuadGeometry(),
          shader: handle.shader,
        });
        mesh.eventMode = "none";
        stage.app.stage.addChild(mesh);
        stage.mesh = mesh;
        stage.handle = handle;
        stage.programKey = programKey;
      }
    }

    stage.fallback.visible = !program && !isScript;
    if (!program && !isScript) {
      stage.fallback.clear();
      stage.fallback
        .circle(0, 0, 1)
        .fill({ color: fallbackColor(definition, params), alpha: 0.18 });
      stage.fallback.circle(0, 0, 1).stroke({
        width: 0.02,
        color: compiled ? 0xef4444 : 0x9ca3af,
        alpha: 0.9,
      });
    }

    if (stage.mesh && definition) {
      stage.mesh.blendMode = definition.blend;
    }
  }, [compiled, definition, params, isScript]);

  // ---------------------------------------------------------------------------
  // Per-frame uniforms; params are packed here too so slider drags are instant
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const tick = () => {
      const { renderer } = stage;
      const width = renderer.width / renderer.resolution;
      const height = renderer.height / renderer.resolution;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(8, Math.min(width, height) * radiusFraction);
      const now = performance.now();
      const clock = clockRef.current;
      if (!paused && clock.last)
        clock.seconds += Math.min(0.1, (now - clock.last) / 1000);
      clock.last = now;
      const seconds = clock.seconds;
      if (stage.mesh) stage.mesh.visible = enabled;
      stage.fallback.visible = enabled && !isScript && !stage.mesh;
      stage.scriptLayer.visible = enabled && isScript;

      stage.fallback.position.set(cx, cy);
      stage.fallback.scale.set(radius);

      // The script scene is authored in SCRIPT_SCENE_SIZE units around its centre.
      const scriptScale = Math.min(width, height) / SCRIPT_SCENE_SIZE;
      stage.scriptLayer.scale.set(scriptScale);
      stage.scriptLayer.position.set(
        cx - (SCRIPT_SCENE_SIZE / 2) * scriptScale,
        cy - (SCRIPT_SCENE_SIZE / 2) * scriptScale,
      );
      stage.sampleLayer.scale.set(scriptScale);
      stage.sampleLayer.position.copyFrom(stage.scriptLayer.position);

      if (stage.mesh && stage.handle && definition) {
        stage.mesh.position.set(cx, cy);
        stage.mesh.scale.set(radius);
        const uniforms = stage.handle.uniforms.uniforms;
        packParamValues(definition.params, params, uniforms.uParams);
        uniforms.uCenter[0] = cx;
        uniforms.uCenter[1] = cy;
        uniforms.uMapSize[0] = width;
        uniforms.uMapSize[1] = height;
        uniforms.uViewport[0] = width;
        uniforms.uViewport[1] = height;
        uniforms.uTime = seconds;
        uniforms.uRadius = radius;
        uniforms.uRotation = 0;
        stage.handle.uniforms.update();
      }
    };

    stage.app.ticker.add(tick);
    return () => {
      // On unmount the boot cleanup has already destroyed the app (and its ticker).
      if (!stage.disposed) stage.app.ticker.remove(tick);
    };
  }, [
    stageReady,
    definition,
    params,
    radiusFraction,
    paused,
    enabled,
    isScript,
  ]);

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      {bootError ? (
        <p
          role="alert"
          className="absolute inset-0 z-10 grid place-content-center bg-background p-6 text-sm text-destructive"
        >
          {bootError}
        </p>
      ) : null}
    </div>
  );
}
