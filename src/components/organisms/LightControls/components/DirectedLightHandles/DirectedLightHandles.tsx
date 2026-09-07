import type { ConicLight, LineLight } from "@shared/index";

import { PixiControlHandle } from "@/components/atoms/PixiControlHandle";
import { getConicAngleHandlePosition } from "@/components/organisms/LightControls/helpers";
import type { LightHandlePointerHandlers } from "@/components/organisms/LightControls/types";
import { drawDashedLink, drawHandle } from "@/lib/pixiControls/helpers";

interface DirectedLightHandlesProps extends LightHandlePointerHandlers {
  light: ConicLight | LineLight;
}

export function DirectedLightHandles({
  light,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: DirectedLightHandlesProps) {
  const angleHandle = light.type === "conic" ? getConicAngleHandlePosition(light) : null;
  const handleProps = {
    draw: drawHandle,
    onPointerMove,
    onPointerUp,
    onPointerOver,
    onPointerOut,
  };

  return (
    <>
      <pixiGraphics
        draw={(graphics) => {
          drawDashedLink(
            graphics,
            { x: light.x, y: light.y },
            { x: light.targetX, y: light.targetY },
          );
          if (angleHandle) {
            drawDashedLink(graphics, { x: light.x, y: light.y }, angleHandle, 0xffffff, 0.55, {
              clear: false,
            });
          }
        }}
        eventMode="none"
      />
      <PixiControlHandle
        x={light.x}
        y={light.y}
        onPointerDown={(event) => onPointerDown(event, light, "source")}
        {...handleProps}
      />
      <PixiControlHandle
        x={light.targetX}
        y={light.targetY}
        onPointerDown={(event) => onPointerDown(event, light, "target")}
        {...handleProps}
      />
      {angleHandle ? (
        <PixiControlHandle
          x={angleHandle.x}
          y={angleHandle.y}
          onPointerDown={(event) => onPointerDown(event, light, "conicAngle")}
          {...handleProps}
        />
      ) : null}
    </>
  );
}
