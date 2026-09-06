import {
  duplicateSceneObject,
  removeSceneObject,
} from "@/lib/effects/sceneObjects";
import { useWorkshopStore } from "@/stores/workshopStore";
import { toast } from "sonner";
import { useEffect } from "react";
import { usePostHog } from "@posthog/react";

import { CanvasContextMenu } from "@/components/molecules/CanvasContextMenu";
import type { MirrorContextMenuState } from "@/components/molecules/MirrorContextMenu/types";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useLightStore } from "@/stores/lightStore/lightStore";

interface Props {
  state: MirrorContextMenuState;
  isGM: boolean;
  onClose: () => void;
}

export function MirrorContextMenu({ state, isGM, onClose }: Props) {
  const posthog = usePostHog();
  const mirror = useLightStore((store) =>
    store.mirrors.find((candidate) => candidate.id === state.mirrorId),
  );
  const updateMirror = useLightStore((store) => store.updateMirror);

  useEffect(() => {
    if (!mirror) {
      onClose();
    }
  }, [mirror, onClose]);

  if (!mirror) {
    return null;
  }

  return (
    <CanvasContextMenu position={state.position} onClose={onClose}>
      <DropdownMenuItem
        onSelect={() => {
          useWorkshopStore.getState().select({ kind: "mirror", id: mirror.id });
          onClose();
        }}
      >
        Inspect controls
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          const copy = duplicateSceneObject({ kind: "mirror", id: mirror.id });
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
          updateMirror(mirror.id, { locked: !mirror.locked });
          onClose();
        }}
      >
        {mirror.locked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          updateMirror(mirror.id, { fixedWidth: !mirror.fixedWidth });
          onClose();
        }}
      >
        {mirror.fixedWidth ? "Unlock Width" : "Lock Width"}
      </DropdownMenuItem>
      {isGM ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            updateMirror(mirror.id, { hidden: !mirror.hidden });
            onClose();
          }}
        >
          {mirror.hidden ? "Show" : "Hide"}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          const undo = removeSceneObject({ kind: "mirror", id: mirror.id });
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
          posthog.capture(ANALYTICS_EVENTS.MirrorRemoved);
          onClose();
        }}
      >
        Delete
      </DropdownMenuItem>
    </CanvasContextMenu>
  );
}
