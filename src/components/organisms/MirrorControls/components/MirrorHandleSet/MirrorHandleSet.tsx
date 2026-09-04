import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";
import type { Mirror } from "@shared/index";

import { PixiControlHandle } from "@/components/atoms/PixiControlHandle";
import { HANDLE_RADIUS } from "@/lib/pixiControls/constants";
import { drawDashedLink, drawHandle } from "@/lib/pixiControls/helpers";
import {
  getMirrorMidpoint,
  type MirrorDragHandleType,
} from "@/components/organisms/MirrorControls/types";

interface MirrorHandleSetProps {
  mirror: Mirror;
  onPointerDown: (
    event: FederatedPointerEvent,
    mirror: Mirror,
    handle: MirrorDragHandleType,
  ) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: (event: FederatedPointerEvent) => void;
}

const drawEndpoint = (graphics: PixiGraphics) => drawHandle(graphics, 0x88ccff);

const drawMidpoint = (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS * 0.8);
  graphics.fill({ color: 0xaaddff, alpha: 0.9 });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

export function MirrorHandleSet({
  mirror,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: MirrorHandleSetProps) {
  const midpoint = getMirrorMidpoint(mirror);
  const shared = { onPointerMove, onPointerUp };

  return (
    <>
      <pixiGraphics
        draw={(graphics) =>
          drawDashedLink(
            graphics,
            { x: mirror.x1, y: mirror.y1 },
            { x: mirror.x2, y: mirror.y2 },
            0x88ccff,
          )
        }
        eventMode="none"
      />
      <PixiControlHandle
        x={mirror.x1}
        y={mirror.y1}
        draw={drawEndpoint}
        onPointerDown={(event) => onPointerDown(event, mirror, "endpoint1")}
        {...shared}
      />
      <PixiControlHandle
        x={mirror.x2}
        y={mirror.y2}
        draw={drawEndpoint}
        onPointerDown={(event) => onPointerDown(event, mirror, "endpoint2")}
        {...shared}
      />
      <PixiControlHandle
        x={midpoint.x}
        y={midpoint.y}
        draw={drawMidpoint}
        cursor="move"
        onPointerDown={(event) => onPointerDown(event, mirror, "midpoint")}
        {...shared}
      />
    </>
  );
}
