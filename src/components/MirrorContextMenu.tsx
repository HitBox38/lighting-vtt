import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLightStore } from "@/stores/lightStore";

export interface MirrorContextMenuState {
  mirrorId: string;
  position: { x: number; y: number };
}

interface Props {
  state: MirrorContextMenuState;
  isGM: boolean;
  onClose: () => void;
}

export function MirrorContextMenu({ state, isGM, onClose }: Props) {
  const mirror = useLightStore((store) =>
    store.mirrors.find((candidate) => candidate.id === state.mirrorId)
  );
  const updateMirror = useLightStore((store) => store.updateMirror);
  const removeMirror = useLightStore((store) => store.removeMirror);

  useEffect(() => {
    if (!mirror) {
      onClose();
    }
  }, [mirror, onClose]);

  if (typeof document === "undefined" || !mirror) {
    return null;
  }

  const hideOptionLabel = mirror.hidden ? "Show" : "Hide";
  const hideOptionVisible = isGM;

  const handleLockToggle = (locked: boolean) => {
    updateMirror(mirror.id, { locked });
    onClose();
  };

  const handleFixedWidthToggle = (fixedWidth: boolean) => {
    updateMirror(mirror.id, { fixedWidth });
    onClose();
  };

  const handleVisibilityToggle = (hidden: boolean) => {
    updateMirror(mirror.id, { hidden });
    onClose();
  };

  const handleDelete = () => {
    removeMirror(mirror.id);
    onClose();
  };

  const menu = (
    <DropdownMenu
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <DropdownMenuTrigger asChild>
        <span
          className="pointer-events-none fixed h-0 w-0"
          style={{
            left: state.position.x,
            top: state.position.y,
          }}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        {mirror.locked ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleLockToggle(false);
            }}>
            Unlock
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleLockToggle(true);
            }}>
            Lock
          </DropdownMenuItem>
        )}
        {mirror.fixedWidth ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleFixedWidthToggle(false);
            }}>
            Unlock Width
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleFixedWidthToggle(true);
            }}>
            Lock Width
          </DropdownMenuItem>
        )}
        {hideOptionVisible && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleVisibilityToggle(!mirror.hidden);
            }}>
            {hideOptionLabel}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            handleDelete();
          }}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return createPortal(menu, document.body);
}

export default MirrorContextMenu;
