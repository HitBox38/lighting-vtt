import {
  duplicateSceneObject,
  removeSceneObject,
} from "@/lib/effects/sceneObjects";
import { useWorkshopStore } from "@/stores/workshopStore";
import { useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import { CanvasContextMenu } from "@/components/molecules/CanvasContextMenu";
import { describeEffectStatus } from "@/components/molecules/EffectContextMenu/helpers";
import type { EffectContextMenuState } from "@/components/molecules/EffectContextMenu/types";
import type { EffectParamsPanelState } from "@/components/molecules/EffectParamsPanel/types";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { effectEditorPath } from "@/lib/effects/routes";
import { cn } from "@/lib/utils";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import { useEffectManager } from "@/stores/lightStore/hooks/useEffectManager";
import { useLightStore } from "@/stores/lightStore/lightStore";

type EffectContextMenuProps = {
  state: EffectContextMenuState;
  isGM: boolean;
  onOpenParams: (state: EffectParamsPanelState) => void;
  onClose: () => void;
};

const TONE_CLASS = {
  neutral: "text-muted-foreground",
  ok: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive",
} as const;

export function EffectContextMenu({
  state,
  isGM,
  onOpenParams,
  onClose,
}: EffectContextMenuProps) {
  const posthog = usePostHog();
  const navigate = useNavigate();
  const effect = useLightStore((store) =>
    store.effects.find((candidate) => candidate.id === state.effectId),
  );
  const updateEffect = useLightStore((store) => store.updateEffect);
  const status = useEffectRuntimeStore((store) =>
    effect ? store.statuses[effect.id] : undefined,
  );
  const enableInstance = useEffectRuntimeStore((store) => store.enableInstance);
  const { changeVersion } = useEffectManager();
  const meta = useQuery(
    api.effects.getEffect,
    effect ? { effectId: effect.effectId } : "skip",
  );
  const versions = useQuery(
    api.effects.listVersions,
    effect ? { effectId: effect.effectId } : "skip",
  );

  useEffect(() => {
    if (!effect) {
      onClose();
    }
  }, [effect, onClose]);

  if (!effect) {
    return null;
  }

  const statusText = describeEffectStatus(status);
  const latestVersion = meta?.latestVersion ?? null;
  const isOutdated = latestVersion !== null && latestVersion > effect.version;

  const handleChangeVersion = (version: number) => {
    const previous = effect.version;
    onClose();
    void changeVersion(effect.id, version).then((result) => {
      if (result.ok) {
        posthog.capture(ANALYTICS_EVENTS.EffectVersionChanged, {
          effect_id: effect.effectId,
          from_version: previous,
          to_version: version,
        });
        return;
      }
      switch (result.reason) {
        case "not-found":
          toast.error(`Version ${version} is not available.`);
          return;
        case "instance-missing":
          return;
        default: {
          const exhaustive: never = result.reason;
          throw new Error(`Unhandled reason: ${String(exhaustive)}`);
        }
      }
    });
  };

  return (
    <CanvasContextMenu
      position={state.position}
      onClose={onClose}
      contentClassName="w-60"
    >
      <DropdownMenuLabel className="flex flex-col gap-0.5">
        <span className="truncate">{meta?.name ?? "Effect"}</span>
        <span
          className={cn("text-[11px] font-normal", TONE_CLASS[statusText.tone])}
          title={statusText.detail ?? undefined}
        >
          {statusText.label}
          {isOutdated
            ? ` · v${effect.version}, v${latestVersion} available`
            : ` · v${effect.version}`}
        </span>
      </DropdownMenuLabel>
      {statusText.detail ? (
        <p className="text-muted-foreground px-2 pb-1.5 text-[11px] leading-snug">
          {statusText.detail}
        </p>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          useWorkshopStore.getState().select({ kind: "effect", id: effect.id });
          onClose();
        }}
      >
        Inspect controls
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          const copy = duplicateSceneObject({ kind: "effect", id: effect.id });
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
          onOpenParams({ effectId: effect.id, position: state.position });
          onClose();
        }}
      >
        Parameters…
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Version</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          {versions === undefined ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : versions.length === 0 ? (
            <DropdownMenuItem disabled>Not available to you</DropdownMenuItem>
          ) : (
            <>
              {isOutdated ? (
                <>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleChangeVersion(latestVersion);
                    }}
                  >
                    Update to latest (v{latestVersion})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuRadioGroup
                value={String(effect.version)}
                onValueChange={(value) => handleChangeVersion(Number(value))}
              >
                {versions.map((row) => (
                  <DropdownMenuRadioItem
                    key={row.version}
                    value={String(row.version)}
                  >
                    v{row.version}
                    <span className="text-muted-foreground ml-auto text-[11px]">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {meta ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onClose();
            navigate(
              effectEditorPath(
                effect.effectId,
                effect.version,
                `${window.location.pathname}${window.location.search}`,
              ),
            );
          }}
        >
          Open in editor
        </DropdownMenuItem>
      ) : null}
      {status?.kind === "disabled" ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            enableInstance(effect.id);
            onClose();
          }}
        >
          Try again
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          updateEffect(effect.id, { locked: !effect.locked });
          onClose();
        }}
      >
        {effect.locked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      {isGM ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            updateEffect(effect.id, { hidden: !effect.hidden });
            onClose();
          }}
        >
          {effect.hidden ? "Show" : "Hide"}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          const effectId = effect.effectId;
          const version = effect.version;
          const undo = removeSceneObject({ kind: "effect", id: effect.id });
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
          posthog.capture(ANALYTICS_EVENTS.EffectRemoved, {
            effect_id: effectId,
            version,
          });
          onClose();
        }}
      >
        Delete
      </DropdownMenuItem>
    </CanvasContextMenu>
  );
}
