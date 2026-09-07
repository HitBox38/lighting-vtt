import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import type { Entry } from "../CodeEditor/authoringReference";

export function referenceExample(
  entry: Entry,
  language: EffectSourceLanguage,
): string | null {
  const signature = entry.signature;
  const script = language === "js" || language === "ts";
  if (signature.includes("function compute"))
    return "export function compute(input) {\n  return { polygons: [], segments: [] };\n}";
  if (signature.includes("effectMain("))
    return language === "wgsl"
      ? "fn effectMain(fx: EffectInput) -> vec4<f32> {\n  return vec4<f32>(1.0, 0.7, 0.3, 1.0);\n}"
      : "vec4 effectMain(EffectInput fx) {\n  return vec4(1.0, 0.7, 0.3, 1.0);\n}";
  if (script && /^input\.[\w.]+$/.test(signature)) return signature;
  if (/^fx\.\w+$/.test(signature)) return signature;
  if (/^effectParam(?:Vec)?\(\d+\)$/.test(signature)) return signature;
  if (signature.startsWith("effectParamVec(")) return "effectParamVec(0)";
  if (signature.startsWith("effectParam(")) return "effectParam(0)";
  if (signature.startsWith("sampleMap(")) return "sampleMap(fx.uv)";
  if (script && signature.startsWith("segments:"))
    return "{ start: { x: 100, y: 100 }, end: { x: 300, y: 300 } }";
  if (script && signature.startsWith("polygons:"))
    return "[{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 200, y: 300 }]";
  return null;
}
