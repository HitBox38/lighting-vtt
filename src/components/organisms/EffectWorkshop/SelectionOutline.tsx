import type { Graphics } from "pixi.js";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useWorkshopStore } from "@/stores/workshopStore";

/** Selection is a separate overlay; selecting never changes the scene's render order. */
export function SelectionOutline() {
  const selection = useWorkshopStore((state) => state.selection);
  const object = useLightStore((state) =>
    selection?.kind === "light"
      ? state.lights.find((item) => item.id === selection.id)
      : selection?.kind === "mirror"
        ? state.mirrors.find((item) => item.id === selection.id)
        : state.effects.find((item) => item.id === selection?.id),
  );
  if (!object) return null;
  return (
    <pixiGraphics
      eventMode="none"
      draw={(graphics: Graphics) => {
        graphics.clear();
        const stroke = { width: 3, color: 0xffbd69, alpha: 0.95 };
        if ("x1" in object) {
          graphics
            .moveTo(object.x1, object.y1)
            .lineTo(object.x2, object.y2)
            .stroke(stroke);
          graphics
            .circle(object.x1, object.y1, 10)
            .circle(object.x2, object.y2, 10)
            .stroke(stroke);
        } else {
          graphics.circle(object.x, object.y, object.radius + 6).stroke(stroke);
          graphics.circle(object.x, object.y, 10).stroke(stroke);
        }
      }}
    />
  );
}
