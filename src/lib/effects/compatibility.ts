import type { EffectDefinition } from "@shared/effects";
import type { EffectDiagnostic } from "./diagnostics";
import type { EffectBackend, ShaderLanguage } from "./shaderContract";

export function backendLanguage(backend: EffectBackend): ShaderLanguage {
  return backend === "webgpu" ? "wgsl" : "glsl";
}

/** Presence only: a nonblank program still needs validation on its own backend. */
export function hasShaderSource(source: string | undefined): boolean {
  return Boolean(source?.trim());
}

/** Prefer the active backend's notice; do not duplicate it with a GLSL reminder. */
export function shaderCompatibilityDiagnostics(
  definition: EffectDefinition,
  backend: EffectBackend | null,
): EffectDiagnostic[] {
  if (definition.kind !== "shader") return [];
  const activeLanguage = backend ? backendLanguage(backend) : null;
  const language = activeLanguage && !hasShaderSource(definition[activeLanguage])
    ? activeLanguage
    : !hasShaderSource(definition.glsl) ? "glsl" : null;
  if (!language) return [];
  const active = language === activeLanguage;
  const renderer = language === "wgsl" ? "WebGPU" : "WebGL";
  return [{
    severity: active ? "warning" : "info",
    language,
    line: null,
    message: `No ${language.toUpperCase()} program. ${renderer} ${active ? "is the active backend and displays" : "players will see"} a plain coverage circle. Shader languages are not converted automatically.`,
  }];
}
