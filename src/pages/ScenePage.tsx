import GameCanvas from "@/components/GameCanvas";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { useLightStore } from "@/stores/lightStore";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { Light, Mirror, LightPreset, TokenInstance, TokenTemplate } from "@shared/index";

export function ScenePage() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const loadScene = useLightStore((state) => state.loadScene);
  const applySyncedState = useLightStore((state) => state._applySyncedState);
  const storeSceneId = useLightStore((state) => state.sceneId);
  const saveStatus = useLightStore((state) => state.saveStatus);

  const isGM = useMemo(() => searchParams.get("isGM") !== "false", [searchParams]);
  const sceneId = searchParams.get("id");

  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");

  const sceneLoaded = storeSceneId === sceneId;

  const canSave = isGM && sceneLoaded && !!user?.id && user.id === scene?.creatorId;

  const lastAppliedUpdatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scene || !sceneId || sceneLoaded) {
      return;
    }

    const lights: Light[] = (scene.lights ?? []) as Light[];
    const mirrors: Mirror[] = (scene.mirrors ?? []) as Mirror[];
    const tokenTemplates: TokenTemplate[] = (scene.tokenTemplates ?? []) as TokenTemplate[];
    const tokens: TokenInstance[] = (scene.tokens ?? []) as TokenInstance[];
    const presets: LightPreset[] = (scene.presets ?? []) as LightPreset[];

    loadScene(sceneId, scene.creatorId, lights, mirrors, tokenTemplates, tokens, presets);
    lastAppliedUpdatedAtRef.current = scene.updatedAt ?? null;
  }, [scene, sceneId, loadScene, sceneLoaded]);

  useEffect(() => {
    if (isGM || !sceneLoaded || !scene) {
      return;
    }

    const incomingUpdatedAt = scene.updatedAt ?? null;

    if (incomingUpdatedAt !== null && incomingUpdatedAt !== lastAppliedUpdatedAtRef.current) {
      lastAppliedUpdatedAtRef.current = incomingUpdatedAt;
      applySyncedState({
        lights: (scene.lights ?? []) as Light[],
        mirrors: (scene.mirrors ?? []) as Mirror[],
        tokenTemplates: (scene.tokenTemplates ?? []) as TokenTemplate[],
        tokens: (scene.tokens ?? []) as TokenInstance[],
        activePresetId: null,
      });
    }
  }, [isGM, sceneLoaded, scene, applySyncedState]);

  if (scene === undefined) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
        <p>Loading scene...</p>
      </div>
    );
  }

  if (scene === null) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
        <p className="text-red-500">Scene not found</p>
      </div>
    );
  }

  return (
    <>
      <GameCanvas mapUrl={scene.mapUrl} isGM={isGM} />
      {isGM && canSave && (
        <div className="pointer-events-none absolute left-4 bottom-4 z-10">
          <SaveStatusIndicator status={saveStatus} />
        </div>
      )}
    </>
  );
}

export default ScenePage;
