import {
  duplicateSceneObject,
  removeSceneObject,
} from "@/lib/effects/sceneObjects";
import { useWorkshopStore } from "@/stores/workshopStore";
import { toast } from "sonner";
import { useEffect } from "react";
import { usePostHog } from "@posthog/react";

import { CanvasContextMenu } from "@/components/molecules/CanvasContextMenu";
import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useLightStore } from "@/stores/lightStore/lightStore";

type LightContextMenuProps = {
  state: LightContextMenuState;
  isGM: boolean;
  onClose: () => void;
};

export function LightContextMenu({
  state,
  isGM,
  onClose,
}: LightContextMenuProps) {
  const posthog = usePostHog();
  const light = useLightStore((store) =>
    store.lights.find((candidate) => candidate.id === state.lightId),
  );
  const updateLight = useLightStore((store) => store.updateLight);

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
        onSelect={() => {
          useWorkshopStore.getState().select({ kind: "light", id: light.id });
          onClose();
        }}
      >
        Inspect controls
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          const copy = duplicateSceneObject({ kind: "light", id: light.id });
          if (copy) useWorkshopStore.getState().select(copy);
          else toast.error("Could not duplicate this object.");
          onClose();
        }}
      >
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          updateLight(light.id, { locked: !light.locked });
          onClose();
        }}
      >
        {light.locked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      {isGM ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            updateLight(light.id, { hidden: !light.hidden });
            onClose();
          }}
        >
          {light.hidden ? "Show" : "Hide"}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          const lightType = light.type;
          const undo = removeSceneObject({ kind: "light", id: light.id });
          if (undo)
            toast("Object removed", {
              duration: 15_000,
              action: {
                label: "Undo",
                onClick: () => {
                  if (!undo()) toast.error("Cannot restore into this scene.");
                },
              },
            });
          posthog.capture(ANALYTICS_EVENTS.LightRemoved, {
            light_type: lightType,
          });
          onClose();
        }}
      >
        Delete
      </DropdownMenuItem>
    </CanvasContextMenu>
  );
}
