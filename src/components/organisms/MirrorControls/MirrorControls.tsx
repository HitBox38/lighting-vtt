import { Fragment } from "react";

import { MirrorHandleSet } from "@/components/organisms/MirrorControls/components/MirrorHandleSet";
import { useMirrorDrag } from "@/components/organisms/MirrorControls/hooks/useMirrorDrag";
import type { MirrorControlsProps } from "@/components/organisms/MirrorControls/types";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function MirrorControls({ isGM, onOpenContextMenu, onCloseContextMenu }: MirrorControlsProps) {
  const mirrors = useLightStore((state) => state.mirrors);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useMirrorDrag({
    isGM,
    onOpenContextMenu,
    onCloseContextMenu,
  });

  if (!isGM || mirrors.length === 0) {
    return null;
  }

  return (
    <>
      {mirrors.map((mirror) => (
        <Fragment key={`${mirror.id}-handles`}>
          <MirrorHandleSet
            mirror={mirror}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </Fragment>
      ))}
    </>
  );
}
