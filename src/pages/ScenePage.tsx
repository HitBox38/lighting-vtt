import GameCanvas from "@/components/GameCanvas";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useLightStore } from "@/stores/lightStore";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Light, Mirror, LightPreset } from "@shared/index";

export function ScenePage() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const loadScene = useLightStore((state) => state.loadScene);
  const storeSceneId = useLightStore((state) => state.sceneId);

  const isGM = useMemo(() => searchParams.get("isGM") !== "false", [searchParams]);
  const sceneId = searchParams.get("id");

  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");

  const sceneLoaded = storeSceneId === sceneId;

  const { status: saveStatus, canSave } = useAutoSave({
    sceneId: sceneId,
    creatorId: scene?.creatorId ?? null,
    userId: user?.id ?? null,
    enabled: isGM && sceneLoaded,
  });

  useEffect(() => {
    if (!scene || !sceneId || sceneLoaded) {
      return;
    }

    const lights: Light[] = (scene.lights ?? []) as Light[];
    const mirrors: Mirror[] = (scene.mirrors ?? []) as Mirror[];
    const presets: LightPreset[] = (scene.presets ?? []) as LightPreset[];

    loadScene(sceneId, scene.creatorId, lights, mirrors, presets);
  }, [scene, sceneId, loadScene, sceneLoaded]);

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
