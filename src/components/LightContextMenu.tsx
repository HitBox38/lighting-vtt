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
        {light.locked ? (
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
        {hideOptionVisible && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleVisibilityToggle(!light.hidden);
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

export default LightContextMenu;
