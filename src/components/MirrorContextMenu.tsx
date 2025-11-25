import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener("contextmenu", handler, true);
    return () => window.removeEventListener("contextmenu", handler, true);
  }, []);

  useEffect(() => {
    if (!triggerRef.current) {
      return;
    }

    const blockNativeContextMenu = (event: MouseEvent) => {
      if ((event as MouseEvent & { __mirrorSynthetic?: boolean }).__mirrorSynthetic) {
        event.preventDefault();
      }
    };

    window.addEventListener("contextmenu", blockNativeContextMenu, { once: true });

    const syntheticEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: state.position.x,
      clientY: state.position.y,
      view: window,
    }) as MouseEvent & { __mirrorSynthetic?: boolean };

    syntheticEvent.__mirrorSynthetic = true;
    triggerRef.current.dispatchEvent(syntheticEvent);
  }, [state.mirrorId, state.position.x, state.position.y]);

  if (typeof document === "undefined" || !mirror) {
    return null;
  }

  const hideOptionLabel = mirror.hidden ? "Show" : "Hide";
  const hideOptionVisible = isGM;

  const handleLockToggle = (locked: boolean) => {
    updateMirror(mirror.id, { locked });
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
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <ContextMenuTrigger
        ref={triggerRef}
        className="fixed left-0 top-0 h-0 w-0 select-none"
        aria-hidden="true"
      />
      <ContextMenuContent ref={contentRef} className="w-48">
        {mirror.locked ? (
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleLockToggle(false);
            }}>
            Unlock
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleLockToggle(true);
            }}>
            Lock
          </ContextMenuItem>
        )}
        {hideOptionVisible && (
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleVisibilityToggle(!mirror.hidden);
            }}>
            {hideOptionLabel}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            handleDelete();
          }}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return createPortal(menu, document.body);
}

export default MirrorContextMenu;
