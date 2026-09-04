import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";
import type { TokenInstance } from "@shared/index";

import { PixiControlHandle } from "@/components/atoms/PixiControlHandle";
import {
  DEFAULT_TOKEN_RADIUS,
  TOKEN_HIT_PADDING,
  getSizeHandlePosition,
} from "@/components/organisms/TokenControls/types";
import { drawDashedLink, drawHandle } from "@/lib/pixiControls/helpers";

interface TokenHandleSetProps {
  token: TokenInstance;
  isSizeEditing: boolean;
  sizeAngle: number;
  onPointerDown: (event: FederatedPointerEvent, tokenId: string, x: number, y: number) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: (event: FederatedPointerEvent) => void;
  onSizePointerDown: (event: FederatedPointerEvent, token: TokenInstance) => void;
  onSizePointerMove: (event: FederatedPointerEvent) => void;
  onSizePointerUp: (event: FederatedPointerEvent) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

const drawWhiteHandle = (graphics: PixiGraphics) => drawHandle(graphics);

const drawHitTarget = (graphics: PixiGraphics, radius: number) => {
  graphics.clear();
  graphics.circle(0, 0, radius);
  graphics.fill({ color: 0xffffff, alpha: 0.001 });
};

export function TokenHandleSet({
  token,
  isSizeEditing,
  sizeAngle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onSizePointerDown,
  onSizePointerMove,
  onSizePointerUp,
  onPointerOver,
  onPointerOut,
}: TokenHandleSetProps) {
  const sizeHandle = getSizeHandlePosition(token, sizeAngle);

  return (
    <>
      <PixiControlHandle
        x={token.x}
        y={token.y}
        draw={(graphics) =>
          drawHitTarget(graphics, (token.size ?? DEFAULT_TOKEN_RADIUS) + TOKEN_HIT_PADDING)
        }
        onPointerDown={(event) => onPointerDown(event, token.id, token.x, token.y)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
      {isSizeEditing ? (
        <>
          <pixiGraphics
            draw={(graphics) =>
              drawDashedLink(graphics, { x: token.x, y: token.y }, sizeHandle)
            }
            eventMode="none"
          />
          <PixiControlHandle
            x={sizeHandle.x}
            y={sizeHandle.y}
            draw={drawWhiteHandle}
            onPointerDown={(event) => onSizePointerDown(event, token)}
            onPointerMove={onSizePointerMove}
            onPointerUp={onSizePointerUp}
          />
        </>
      ) : null}
    </>
  );
}
