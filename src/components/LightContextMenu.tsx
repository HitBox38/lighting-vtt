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

export type LightContextMenuState = {
  lightId: string;
  position: { x: number; y: number };
};

type LightContextMenuProps = {
  state: LightContextMenuState;
  isGM: boolean;
  onClose: () => void;
};

export function LightContextMenu({ state, isGM, onClose }: LightContextMenuProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const light = useLightStore((store) =>
    store.lights.find((candidate) => candidate.id === state.lightId)
  );
  const updateLight = useLightStore((store) => store.updateLight);
  const removeLight = useLightStore((store) => store.removeLight);

  useEffect(() => {
    if (!light) {
      onClose();
    }
  }, [light, onClose]);

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
      if ((event as MouseEvent & { __lightSynthetic?: boolean }).__lightSynthetic) {
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
    }) as MouseEvent & { __lightSynthetic?: boolean };

    syntheticEvent.__lightSynthetic = true;
    triggerRef.current.dispatchEvent(syntheticEvent);
  }, [state.lightId, state.position.x, state.position.y]);

  if (typeof document === "undefined" || !light) {
    return null;
  }

  const hideOptionLabel = light.hidden ? "Show" : "Hide";
  const hideOptionVisible = isGM;

  const handleLockToggle = (locked: boolean) => {
    updateLight(light.id, { locked });
    onClose();
  };

  const handleVisibilityToggle = (hidden: boolean) => {
    updateLight(light.id, { hidden });
    onClose();
  };

  const handleDelete = () => {
    removeLight(light.id);
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
        {light.locked ? (
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
              handleVisibilityToggle(!light.hidden);
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

export default LightContextMenu;
