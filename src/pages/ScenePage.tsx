import GameCanvas from "@/components/GameCanvas";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useLightStore } from "@/stores/lightStore";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { GetSceneResponse, Light, Mirror, LightPreset } from "@shared/index";

export function ScenePage() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const loadScene = useLightStore((state) => state.loadScene);

  const isGM = useMemo(() => searchParams.get("isGM") !== "false", [searchParams]);
  const sceneId = searchParams.get("id");

  const [scene, setScene] = useState<GetSceneResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // Auto-save hook - only enabled for GM who is the creator
  const { status: saveStatus, canSave } = useAutoSave({
    sceneId: sceneId,
    creatorId: scene?.payload?.creatorId ?? null,
    userId: user?.id ?? null,
    enabled: isGM && sceneLoaded,
  });

  useEffect(() => {
    const fetchScene = async () => {
      if (!sceneId) {
        setError("No scene ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setSceneLoaded(false);
        const response = await fetch(`/api/scene/${sceneId}`);
        const data = (await response.json()) as GetSceneResponse;

        if (!data.payload) {
          setError(data.message || "Scene not found");
        } else {
          setScene(data);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scene");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchScene();
  }, [sceneId]);

  // Load scene data into the store when scene is fetched
  useEffect(() => {
    if (!scene?.payload || !sceneId || sceneLoaded) {
      return;
    }

    // Parse lights, mirrors, and presets from scene state
    const lightsState = scene.payload.lightsState as { lights?: Light[] } | null;
    const mirrorsState = scene.payload.mirrorsState as { mirrors?: Mirror[] } | null;

    const lights = lightsState?.lights ?? [];
    const mirrors = mirrorsState?.mirrors ?? [];
    const presets: LightPreset[] = scene.payload.presets ?? [];

    loadScene(sceneId, scene.payload.creatorId, lights, mirrors, presets);
    setSceneLoaded(true);
  }, [scene, sceneId, loadScene, sceneLoaded]);

  if (isLoading) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
        <p>Loading scene...</p>
      </div>
    );
  }

  if (error || !scene?.payload) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
        <p className="text-red-500">{error || "Scene not found"}</p>
      </div>
    );
  }

  return (
    <>
      <GameCanvas mapUrl={scene.payload.mapUrl} isGM={isGM} />
      {isGM && canSave && (
        <div className="pointer-events-none absolute right-4 top-4 z-10">
          <SaveStatusIndicator status={saveStatus} />
        </div>
      )}
    </>
  );
}

export default ScenePage;
