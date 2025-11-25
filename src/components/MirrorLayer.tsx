import { useCallback, useMemo } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";

interface Props {
  isGM?: boolean;
}

const MIRROR_COLOR = 0x88ccff;
const MIRROR_ALPHA = 0.5;
const MIRROR_WIDTH = 4;

export function MirrorLayer({ isGM = true }: Props) {
  const mirrors = useLightStore((state) => state.mirrors);
  const visibleMirrors = useMemo(
    () => (isGM ? mirrors : mirrors.filter((mirror) => !mirror.hidden)),
    [isGM, mirrors]
  );

  const drawMirrors = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      if (!visibleMirrors.length) {
        return;
      }

      for (const mirror of visibleMirrors) {
        const alpha = mirror.hidden ? MIRROR_ALPHA * 0.4 : MIRROR_ALPHA;

        // Draw mirror as a thick line with rounded ends
        graphics.setStrokeStyle({
          width: MIRROR_WIDTH,
          color: MIRROR_COLOR,
          alpha,
          cap: "round",
        });

        graphics.moveTo(mirror.x1, mirror.y1);
        graphics.lineTo(mirror.x2, mirror.y2);
        graphics.stroke();
      }
    },
    [visibleMirrors]
  );

  if (!visibleMirrors.length) {
    return null;
  }

  return <pixiGraphics draw={drawMirrors} eventMode="none" />;
}

export default MirrorLayer;
