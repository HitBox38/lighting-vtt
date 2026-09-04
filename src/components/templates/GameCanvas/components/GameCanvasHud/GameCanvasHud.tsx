import { usePostHog } from "@posthog/react";

import { LightToolbar } from "@/components/molecules/LightToolbar";
import { MirrorToolbar } from "@/components/molecules/MirrorToolbar";
import { PlayerViewToolbar } from "@/components/molecules/PlayerViewToolbar";
import { UserToolbar } from "@/components/molecules/UserToolbar";
import { PlayersSheet } from "@/components/organisms/PlayersSheet";
import { PresetToolbar } from "@/components/organisms/PresetToolbar";
import { TokenToolbar } from "@/components/organisms/TokenToolbar";
import { useLightManager } from "@/stores/lightStore/hooks/useLightManager";
import { useMirrorManager } from "@/stores/lightStore/hooks/useMirrorManager";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import type { LightType } from "@shared/index";

interface GameCanvasHudProps {
  sceneId?: string | null;
  getViewportCenterWorld: () => { x: number; y: number };
}

export function GameCanvasHud({ sceneId, getViewportCenterWorld }: GameCanvasHudProps) {
  const posthog = usePostHog();
  const { addLight } = useLightManager();
  const { addMirror } = useMirrorManager();

  const handleAddLight = (type: LightType) => {
    const { x, y } = getViewportCenterWorld();
    addLight(type, x, y);
    posthog.capture(ANALYTICS_EVENTS.LightAdded, { light_type: type });
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-black/35 via-black/20 to-transparent dark:from-black/55 dark:via-black/30" />
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-3 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-wrap items-start gap-2">
            <PresetToolbar />
            <LightToolbar
              onAddRadial={() => handleAddLight("radial")}
              onAddConic={() => handleAddLight("conic")}
              onAddLine={() => handleAddLight("line")}
            />
            <MirrorToolbar
              onAddMirror={() => {
                const { x, y } = getViewportCenterWorld();
                addMirror(x, y);
                posthog.capture(ANALYTICS_EVENTS.MirrorAdded);
              }}
            />
            <TokenToolbar />
            <PlayerViewToolbar />
            {sceneId ? <PlayersSheet sceneId={sceneId} /> : null}
          </div>
          <div className="pointer-events-auto shrink-0">
            <UserToolbar />
          </div>
        </div>
      </div>
    </>
  );
}
