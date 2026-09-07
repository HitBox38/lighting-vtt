import type { Light } from "@shared/index";

import { PixiControlHandle } from "@/components/atoms/PixiControlHandle";
import { getRadialHandlePosition } from "@/components/organisms/LightControls/helpers";
import type { LightHandlePointerHandlers } from "@/components/organisms/LightControls/types";
import { drawDashedLink, drawHandle } from "@/lib/pixiControls/helpers";

interface RadialLightHandlesProps extends LightHandlePointerHandlers {
  light: Light;
  radialAngle: number;
}

export function RadialLightHandles({
  light,
  radialAngle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: RadialLightHandlesProps) {
  const radiusHandle = getRadialHandlePosition(light, radialAngle);
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
        draw={(graphics) => drawDashedLink(graphics, { x: light.x, y: light.y }, radiusHandle)}
        eventMode="none"
      />
      <PixiControlHandle
        x={light.x}
        y={light.y}
        onPointerDown={(event) => onPointerDown(event, light, "radial")}
        {...handleProps}
      />
      <PixiControlHandle
        x={radiusHandle.x}
        y={radiusHandle.y}
        onPointerDown={(event) => onPointerDown(event, light, "radialRadius")}
        {...handleProps}
      />
    </>
  );
}
