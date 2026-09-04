import { useEffect } from "react";
import { usePostHog } from "@posthog/react";

import { CanvasContextMenu } from "@/components/molecules/CanvasContextMenu";
import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useLightStore } from "@/stores/lightStore/lightStore";

type LightContextMenuProps = {
  state: LightContextMenuState;
  isGM: boolean;
  onClose: () => void;
};

export function LightContextMenu({ state, isGM, onClose }: LightContextMenuProps) {
  const posthog = usePostHog();
  const light = useLightStore((store) =>
    store.lights.find((candidate) => candidate.id === state.lightId),
  );
  const updateLight = useLightStore((store) => store.updateLight);
  const removeLight = useLightStore((store) => store.removeLight);

  useEffect(() => {
    if (!light) {
      onClose();
    }
  }, [light, onClose]);

  if (!light) {
    return null;
  }

  return (
    <CanvasContextMenu position={state.position} onClose={onClose}>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          updateLight(light.id, { locked: !light.locked });
          onClose();
        }}>
        {light.locked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      {isGM ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            updateLight(light.id, { hidden: !light.hidden });
            onClose();
          }}>
          {light.hidden ? "Show" : "Hide"}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          const lightType = light.type;
          removeLight(light.id);
          posthog.capture(ANALYTICS_EVENTS.LightRemoved, { light_type: lightType });
          onClose();
        }}>
        Delete
      </DropdownMenuItem>
    </CanvasContextMenu>
  );
}
