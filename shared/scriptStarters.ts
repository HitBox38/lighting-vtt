import type { EffectDefinition } from "./effects";

const geometry = (name: string, description: string, params: EffectDefinition["params"], script: string): EffectDefinition => ({
  name, description, params, script, kind: "script", wgsl: "", category: "Geometry", blend: "normal", coverage: { kind: "none" },
});

export const SCRIPT_STARTERS: readonly EffectDefinition[] = [
  geometry("Radial Fan", "A fan of light wedges. Rotate the effect, then tune the spread and ray count.", [
    { key: "spread", label: "Spread (degrees)", type: "number", min: 20, max: 300, step: 5, default: 120 },
    { key: "rays", label: "Rays", type: "number", min: 3, max: 12, step: 1, default: 7 },
  ], `export function compute({ effect, params }) {
  // Bound output to 12 wedges, four points each.
  const count = Math.max(3, Math.min(12, Math.round(Number(params.rays) || 7)));
  const spread = Math.max(20, Math.min(300, Number(params.spread) || 120)) * Math.PI / 180;
  const radius = Math.max(1, effect.radius);
  const step = spread / count;
  const point = (angle, r) => ({ x: effect.x + Math.cos(angle) * r, y: effect.y + Math.sin(angle) * r });
  const polygons = [];
  for (let i = 0; i < count; i++) {
    const angle = effect.rotation - spread / 2 + step * (i + 0.5);
    const half = step * 0.29;
    polygons.push([point(angle - half, radius * 0.1), point(angle - half, radius), point(angle + half, radius), point(angle + half, radius * 0.1)]);
  }
  return { polygons };
}`),
  geometry("Segmented Ring", "A ward with adjustable thickness and open gates. Set gates to zero for a complete ring.", [
    { key: "thickness", label: "Thickness (%)", type: "number", min: 5, max: 45, step: 1, default: 18 },
    { key: "gates", label: "Gates", type: "number", min: 0, max: 8, step: 1, default: 4 },
  ], `export function compute({ effect, params }) {
  // Fixed 64 segments stay within the polygon limit.
  const outer = Math.max(1, effect.radius);
  const inner = outer * (1 - Math.max(5, Math.min(45, Number(params.thickness) || 18)) / 100);
  const gates = Math.max(0, Math.min(8, Math.round(Number(params.gates) || 0)));
  const point = (angle, r) => ({ x: effect.x + Math.cos(angle + effect.rotation) * r, y: effect.y + Math.sin(angle + effect.rotation) * r });
  const polygons = [];
  for (let i = 0; i < 64; i++) {
    const a = i * Math.PI * 2 / 64, b = (i + 1) * Math.PI * 2 / 64;
    if (gates && Math.cos((a + b) * 0.5 * gates) > 0.88) continue;
    polygons.push([point(a, inner), point(a, outer), point(b, outer), point(b, inner)]);
  }
  return { polygons };
}`),
  geometry("Nearest-light Chain", "A path through nearby lights. Use Lights & Mirrors in the preview and move the sample light to reroute it.", [
    { key: "width", label: "Path width", type: "number", min: 2, max: 80, step: 1, default: 18 },
    { key: "links", label: "Maximum links", type: "number", min: 1, max: 8, step: 1, default: 6 },
  ], `export function compute({ effect, params, lights }) {
  const width = Math.max(2, Math.min(80, Number(params.width) || 18)) / 2;
  const links = Math.max(1, Math.min(8, Math.round(Number(params.links) || 6)));
  // Limit both input work and output. Coincident lights cannot divide by zero.
  const candidates = lights.slice(0, 256).filter(light => Math.hypot(light.x - effect.x, light.y - effect.y) <= effect.radius + light.radius);
  const polygons = [];
  let current = effect;
  for (let i = 0; i < links && candidates.length; i++) {
    let nearest = 0;
    for (let j = 1; j < candidates.length; j++) {
      if (Math.hypot(candidates[j].x - current.x, candidates[j].y - current.y) < Math.hypot(candidates[nearest].x - current.x, candidates[nearest].y - current.y)) nearest = j;
    }
    const next = candidates.splice(nearest, 1)[0];
    const dx = next.x - current.x, dy = next.y - current.y, distance = Math.hypot(dx, dy);
    if (distance < 0.1) continue;
    const nx = -dy / distance * width, ny = dx / distance * width;
    polygons.push([{ x: current.x + nx, y: current.y + ny }, { x: next.x + nx, y: next.y + ny }, { x: next.x - nx, y: next.y - ny }, { x: current.x - nx, y: current.y - ny }]);
    current = next;
  }
  return { polygons };
}`),
];
