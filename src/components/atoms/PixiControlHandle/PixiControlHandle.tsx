import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

interface PixiControlHandleProps {
  x: number;
  y: number;
  draw: (graphics: PixiGraphics) => void;
  cursor?: string;
  onPointerDown: (event: FederatedPointerEvent) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: (event: FederatedPointerEvent) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function PixiControlHandle({
  x,
  y,
  draw,
  cursor = "grab",
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: PixiControlHandleProps) {
  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor={cursor}
      onPointerDown={onPointerDown}
      onGlobalPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerUpOutside={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  );
}
