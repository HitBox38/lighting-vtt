import type { Graphics } from "pixi.js";
import { hexToRgba, type EffectDefinition, type EffectParamValues } from "@shared/effects";
import type { EffectInstanceStatus } from "@/stores/effectRuntimeStore/effectRuntimeStore";

type FallbackStatus = Exclude<EffectInstanceStatus["kind"], "ok">;
const STROKE: Record<FallbackStatus, number> = {
  loading: 0x9ca3af,
  compiling: 0x9ca3af,
  "missing-definition": 0x6b7280,
  "missing-program": 0xf59e0b,
  error: 0xef4444,
  disabled: 0xef4444,
};

/** Visual fallback only. Darkness coverage remains the definition's responsibility. */
export function drawEffectFallback(
  graphics: Graphics,
  definition: EffectDefinition | null | undefined,
  params: EffectParamValues,
  status: FallbackStatus,
  radius: number,
  showDiagnostics: boolean,
): void {
  const colorParam = definition?.params.find((param) => param.type === "color");
  const value = colorParam ? params[colorParam.key] : undefined;
  const [r, g, b] = hexToRgba(typeof value === "string" ? value : colorParam?.default ?? "#ffffff");
  const color = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  graphics.clear();
  // Tessellate at the displayed radius: scaling a unit circle magnifies its
  // coarse polygon edges at tabletop sizes.
  graphics.circle(0, 0, radius).fill({ color, alpha: 0.18 });
  if (showDiagnostics) {
    graphics.circle(0, 0, radius).stroke({
      width: 2,
      color: STROKE[status],
      alpha: 0.9,
    });
  }
}
