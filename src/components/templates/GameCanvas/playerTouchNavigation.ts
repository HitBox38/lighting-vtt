import type { Container, FederatedPointerEvent } from "pixi.js";

type Point = { x: number; y: number };

/** Only touches starting on the map reach this handler; token drags keep ownership. */
export function attachPlayerTouchNavigation(
  stage: Container,
  getContainer: () => Container | null,
  clampZoom: (scale: number) => number,
  isEnabled: () => boolean = () => true,
) {
  const touches = new Map<number, Point>();
  const down = (event: FederatedPointerEvent) => {
    if (!isEnabled() || event.pointerType !== "touch" || touches.size >= 2) return;
    touches.set(event.pointerId, { x: event.global.x, y: event.global.y });
  };
  const move = (event: FederatedPointerEvent) => {
    if (!isEnabled()) {
      touches.clear();
      return;
    }
    const previous = touches.get(event.pointerId);
    const container = getContainer();
    if (!previous || !container) return;
    const next = { x: event.global.x, y: event.global.y };
    const other = [...touches.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
      if (oldDistance > 0 && newDistance > 0) {
        const scale = container.scale.x;
        const nextScale = clampZoom(scale * newDistance / oldDistance);
        const worldX = ((previous.x + other.x) / 2 - container.x) / scale;
        const worldY = ((previous.y + other.y) / 2 - container.y) / scale;
        container.scale.set(nextScale);
        container.position.set(
          (next.x + other.x) / 2 - worldX * nextScale,
          (next.y + other.y) / 2 - worldY * nextScale,
        );
      }
    } else {
      container.position.set(container.x + next.x - previous.x, container.y + next.y - previous.y);
    }
    touches.set(event.pointerId, next);
  };
  const up = (event: FederatedPointerEvent) => { touches.delete(event.pointerId); };
  stage.on("pointerdown", down);
  stage.on("globalpointermove", move);
  const endEvents = ["pointerup", "pointerupoutside", "pointercancel", "pointerleave"] as const;
  for (const name of endEvents) stage.on(name, up);
  return () => {
    touches.clear();
    stage.off("pointerdown", down);
    stage.off("globalpointermove", move);
    for (const name of endEvents) stage.off(name, up);
  };
}
