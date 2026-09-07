import { describe, expect, test } from "bun:test";
import { Graphics, RendererType, type Renderer } from "pixi.js";
import { effectDefinitionSchema, type EffectDefinition, type EffectInstance } from "../shared/effects";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { compileEffect, effectCacheKey, previewCacheKey } from "../src/lib/effects/effectRegistry";
import { shaderCompatibilityDiagnostics } from "../src/lib/effects/compatibility";
import { drawEffectFallback } from "../src/lib/effects/fallback";
import { draftFromDefinition, newEffectDraft, recoveryDraftSchema, toDefinition } from "../src/pages/EffectEditorPage/hooks/useEffectDraft";
import { previewSaveBlocker } from "../src/pages/EffectEditorPage/components/EffectEditor/previewValidation";
import { drawEffects } from "../src/components/organisms/LightingLayer/drawEffects";

const definition = (): EffectDefinition => ({ ...EFFECT_STARTERS[0] });

describe("author-supplied shader sources", () => {
  test("WGSL is required even with valid GLSL; GLSL can be absent or blank", () => {
    for (const wgsl of ["", " \n\t"]) {
      expect(effectDefinitionSchema.safeParse({ ...definition(), wgsl }).success).toBe(false);
    }
    for (const glsl of [undefined, "", " \n\t"]) {
      const saved = effectDefinitionSchema.parse({ ...definition(), glsl });
      expect(saved.wgsl).toBe(definition().wgsl);
      expect(saved.glsl).toBe(glsl);
    }
  });

  test("draft recovery and remix round trips preserve source bytes and independent edits", () => {
    const original = { ...definition(), wgsl: ` \n${definition().wgsl}\n`, glsl: `\t${definition().glsl}\n ` };
    const draft = recoveryDraftSchema.parse(JSON.parse(JSON.stringify(draftFromDefinition(original))));
    expect(toDefinition(draft)).toEqual(original);
    const edited = toDefinition({ ...draft, wgsl: `${draft.wgsl}\n// WGSL-only edit` });
    expect(edited.glsl).toBe(original.glsl);
    const restored = toDefinition({ ...draft, glsl: `${draft.glsl}\n// GLSL-only edit` });
    expect(restored.wgsl).toBe(original.wgsl);
    for (const glsl of ["", " \n\t"]) {
      expect(toDefinition({ ...draft, glsl }).glsl).toBeUndefined();
    }
    expect(toDefinition({ ...draft, glsl: "" }).wgsl).toBe(original.wgsl);
    expect(newEffectDraft("shader").glsl).toContain("effectMain");
  });

  test("each curated shader contains independent sources", () => {
    for (const starter of EFFECT_STARTERS.filter((item) => item.kind === "shader")) {
      expect(starter.wgsl).toContain("fn effectMain(fx: EffectInput) -> vec4<f32>");
      expect(starter.glsl).toContain("vec4 effectMain(EffectInput fx)");
      expect(starter.glsl).not.toContain("vec4<f32>");
    }
  });
});

describe("active backend selection", () => {
  test("missing sources never touch the GPU or compile the other language", async () => {
    for (const backend of ["webgpu", "webgl"] as const) {
      const renderer = {
        type: backend === "webgpu" ? RendererType.WEBGPU : RendererType.WEBGL,
        get gpu() { throw new Error("GPU must not be touched"); },
        get gl() { throw new Error("GL must not be touched"); },
      } as unknown as Renderer;
      for (const source of [undefined, "", " \n\t"]) {
        const language = backend === "webgpu" ? "wgsl" : "glsl";
        const input = { ...definition(), [language]: source } as EffectDefinition;
        expect(await compileEffect(renderer, input)).toEqual({ status: "missing-program", backend, language });
      }
      const invalid = { ...definition(), wgsl: "not a shader", glsl: "not a shader" };
      expect((await compileEffect(renderer, invalid)).status).toBe("error");
    }
  });

  test("GPU validation errors remain errors for nonblank WGSL", async () => {
    const renderer = {
      type: RendererType.WEBGPU,
      gpu: { device: {
        pushErrorScope() {},
        async popErrorScope() { return null; },
        createShaderModule() {
          return { async getCompilationInfo() { return { messages: [{ type: "error", message: "invalid expression", lineNum: 0 }] }; } };
        },
      } },
    } as unknown as Renderer;
    const result = await compileEffect(renderer, definition());
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.diagnostics[0].message).toBe("invalid expression");
  });

  test("source changes and backend/version pins have distinct cache keys", () => {
    expect(previewCacheKey(definition(), "webgl")).not.toBe(previewCacheKey({ ...definition(), glsl: "" }, "webgl"));
    expect(effectCacheKey("effect", 1, "webgpu")).not.toBe(effectCacheKey("effect", 1, "webgl"));
    expect(effectCacheKey("effect", 1, "webgl")).not.toBe(effectCacheKey("effect", 2, "webgl"));
  });

  test("one notice describes missing GLSL; fallback is not a preview save blocker", () => {
    const input = { ...definition(), glsl: " \n " };
    for (const backend of ["webgpu", "webgl"] as const) {
      const notices = shaderCompatibilityDiagnostics(input, backend);
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ language: "glsl", severity: backend === "webgl" ? "warning" : "info" });
    }
    expect(shaderCompatibilityDiagnostics(definition(), "webgl")).toEqual([]);
    expect(shaderCompatibilityDiagnostics({ ...input, wgsl: "" }, "webgpu")[0].language).toBe("wgsl");
    expect(previewSaveBlocker({ kind: "missing-program", backend: "webgl" }, false, false, false)).toBeNull();
    expect(previewSaveBlocker({ kind: "error", backend: "webgl" }, false, false, false)).not.toBeNull();
    expect(previewSaveBlocker({ kind: "missing-program", backend: "webgl" }, true, false, false)).not.toBeNull();
  });
});

describe("plain fallback circles", () => {
  test("preview/GM colors and fixed-width outlines distinguish missing, failed, and loading programs", () => {
    for (const [status, color] of [["missing-program", 0xf59e0b], ["error", 0xef4444], ["compiling", 0x9ca3af]] as const) {
      const graphics = new Graphics();
      drawEffectFallback(graphics, definition(), { color: "#123456" }, status, 100, true);
      const instructions = graphics.context.instructions;
      expect(instructions[0]).toMatchObject({ action: "fill", data: { style: { color: 0x123456, alpha: 0.18 } } });
      expect(instructions[1]).toMatchObject({ action: "stroke", data: { style: { color, width: 2 } } });
      drawEffectFallback(graphics, definition(), {}, status, 200, true);
      expect(graphics.context.instructions[1]).toMatchObject({ data: { style: { width: 2 } } });
      expect(graphics.getLocalBounds().width).toBeCloseTo(402);
      graphics.destroy();
    }
  });

  test("players get fill only, using the first color default or white", () => {
    const graphics = new Graphics();
    drawEffectFallback(graphics, definition(), {}, "missing-program", 100, false);
    expect(graphics.context.instructions).toHaveLength(1);
    expect(graphics.context.instructions[0]).toMatchObject({ data: { style: { color: 0xffac55 } } });
    drawEffectFallback(graphics, undefined, {}, "missing-definition", 100, false);
    expect(graphics.context.instructions[0]).toMatchObject({ data: { style: { color: 0xffffff } } });
    graphics.destroy();
  });

  test("missing GLSL preserves declared darkness coverage", () => {
    const instance: EffectInstance = { id: "instance", effectId: "effect", version: 1, x: 35, y: 70, radius: 100, rotation: 0, params: {} };
    for (const kind of ["circle", "none"] as const) {
      const graphics = new Graphics();
      drawEffects(graphics, [instance], new Map([["effect@1", { ...definition(), glsl: undefined, coverage: { kind } }]]), new Map());
      expect(graphics.context.instructions).toHaveLength(kind === "circle" ? 1 : 0);
      graphics.destroy();
    }
  });
});
