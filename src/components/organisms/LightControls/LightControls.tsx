import { Fragment } from "react";

import { LightHandleSet } from "@/components/organisms/LightControls/components/LightHandleSet";
import { useLightDrag } from "@/components/organisms/LightControls/hooks/useLightDrag";
import type { LightControlsProps } from "@/components/organisms/LightControls/types";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function LightControls({ isGM, onOpenContextMenu, onCloseContextMenu }: LightControlsProps) {
  const lights = useLightStore((state) => state.lights);
  const setHoveredLightId = useLightStore((state) => state.setHoveredLightId);
  const { handlePointerDown, handlePointerMove, handlePointerUp, getRadialAngle } = useLightDrag({
    isGM,
    onOpenContextMenu,
    onCloseContextMenu,
  });

  if (!isGM || lights.length === 0) {
    return null;
  }

  return (
    <>
      {lights.map((light) => (
        <Fragment key={`${light.id}-handles`}>
          <LightHandleSet
            light={light}
            radialAngle={getRadialAngle(light.id)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={() => setHoveredLightId(light.id)}
            onPointerOut={() => setHoveredLightId(null)}
          />
        </Fragment>
      ))}
    </>
  );
}
