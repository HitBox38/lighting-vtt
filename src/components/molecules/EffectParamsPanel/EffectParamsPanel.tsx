import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HUD_SURFACE_CLASSNAME } from "@/components/atoms/HudSurface/constants";
import { EffectParamFields } from "@/components/molecules/EffectParamFields";
import type { EffectParamsPanelState } from "@/components/molecules/EffectParamsPanel/types";
import { effectRefKey, useEffectDefinitions } from "@/lib/effects/hooks/useEffectDefinitions";
import { cn } from "@/lib/utils";
import { useLightStore } from "@/stores/lightStore/lightStore";

interface Props {
  state: EffectParamsPanelState;
  onClose: () => void;
}

const PANEL_WIDTH = 288;
const VIEWPORT_MARGIN = 12;

/**
 * Floating card with the generated param inputs for one placed instance.
 * Edits apply immediately to the store (and therefore to the running shader),
 * so the GM tunes the effect while watching it.
 */
export function EffectParamsPanel({ state, onClose }: Props) {
  const effect = useLightStore((store) => store.effects.find((candidate) => candidate.id === state.effectId));
  const sceneId = useLightStore((store) => store.sceneId);
  const updateEffect = useLightStore((store) => store.updateEffect);
  const panelRef = useRef<HTMLDivElement>(null);

  const instances = useMemo(() => (effect ? [effect] : []), [effect]);
  const { definitions, isLoading } = useEffectDefinitions(instances, sceneId);
  const definition = effect ? definitions.get(effectRefKey(effect.effectId, effect.version)) : undefined;

  useEffect(() => {
    if (!effect) {
      onClose();
    }
  }, [effect, onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handlePointer = (event: PointerEvent) => {
      const panel = panelRef.current;
      if (panel && event.target instanceof Node && !panel.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("pointerdown", handlePointer, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("pointerdown", handlePointer, { capture: true });
    };
  }, [onClose]);

  const handleChange = useCallback(
    (params: Parameters<typeof updateEffect>[1]["params"]) => {
      if (!effect || !params) return;
      updateEffect(effect.id, { params });
    },
    [effect, updateEffect],
  );

  if (typeof document === "undefined" || !effect) {
    return null;
  }

  // Keep the panel on screen; it opens at the context-menu position, which may be near an edge.
  const left = Math.min(state.position.x, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN);
  const top = Math.min(state.position.y, window.innerHeight - 320);

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Parameters for ${definition?.name ?? "effect"}`}
      className={cn(HUD_SURFACE_CLASSNAME, "fixed z-50 flex-col px-3 py-3")}
      style={{ left: Math.max(VIEWPORT_MARGIN, left), top: Math.max(VIEWPORT_MARGIN, top), width: PANEL_WIDTH }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{definition?.name ?? "Effect"}</p>
          <p className="text-muted-foreground text-[11px]">Version {effect.version}</p>
        </div>
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose} aria-label="Close parameters">
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="mt-1">
        {definition ? (
          <EffectParamFields
            params={definition.params}
            values={effect.params}
            onChange={handleChange}
            disabled={effect.locked === true}
          />
        ) : (
          <p className="text-muted-foreground text-xs">
            {isLoading ? "Loading definition…" : "This version is not available, so its parameters cannot be edited."}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
