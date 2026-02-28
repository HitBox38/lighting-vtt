import GameCanvas from "@/components/GameCanvas";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { useLightStore } from "@/stores/lightStore";
import { useTokenStore } from "@/stores/tokenStore";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { Light, Mirror, LightPreset, TokenInstance, TokenTemplate } from "@shared/index";
import { RemotePlayerHud } from "@/components/RemotePlayerHud";

export function ScenePage() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const loadScene = useLightStore((state) => state.loadScene);
  const applySyncedState = useLightStore((state) => state._applySyncedState);
  const loadSceneTokens = useTokenStore((state) => state.loadSceneTokens);
  const storeSceneId = useLightStore((state) => state.sceneId);
  const saveStatus = useLightStore((state) => state.saveStatus);

  const isGM = useMemo(() => searchParams.get("isGM") !== "false", [searchParams]);
  const sceneId = searchParams.get("id");
  const remotePlayerId = searchParams.get("playerId");

  const isRemotePlayer = !!remotePlayerId;

  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");

  const sceneLoaded = storeSceneId === sceneId;

  const canSave = isGM && !isRemotePlayer && sceneLoaded && !!user?.id && user.id === scene?.creatorId;

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
    loadSceneTokens(tokenTemplates, tokens);
    lastAppliedUpdatedAtRef.current = scene.updatedAt ?? null;
  }, [scene, sceneId, loadScene, loadSceneTokens, sceneLoaded]);

  const isNonGMView = !isGM || isRemotePlayer;

  useEffect(() => {
    if (!isNonGMView || !sceneLoaded || !scene) {
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
  }, [isNonGMView, sceneLoaded, scene, applySyncedState]);

  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);

  useEffect(() => {
    if (!isGM || isRemotePlayer || !sceneLoaded || !scene) return;

    const players = (scene as Record<string, unknown>).players as
      | Array<{ id: string; tokenInstanceIds: string[] }>
      | undefined;
    if (!players || players.length === 0) return;

    const playerTokenIds = new Set(players.flatMap((p) => p.tokenInstanceIds));
    if (playerTokenIds.size === 0) return;

    const incomingTokens = (scene.tokens ?? []) as TokenInstance[];
    const localTokens = useTokenStore.getState().tokens;

    for (const incomingToken of incomingTokens) {
      if (!playerTokenIds.has(incomingToken.id)) continue;
      const localToken = localTokens.find((t) => t.id === incomingToken.id);
      if (!localToken) continue;
      if (localToken.x !== incomingToken.x || localToken.y !== incomingToken.y) {
        updateTokenInstance(incomingToken.id, {
          x: incomingToken.x,
          y: incomingToken.y,
        });
      }
    }
  }, [isGM, isRemotePlayer, sceneLoaded, scene, updateTokenInstance]);

  const remotePlayerInfo = useMemo(() => {
    if (!isRemotePlayer || !scene) return null;
    const players = (scene as Record<string, unknown>).players as Array<{
      id: string;
      playerName: string;
      characterName: string;
      tokenInstanceIds: string[];
    }> | undefined;
    const activePlayerIds = (scene as Record<string, unknown>).activePlayerIds as string[] | undefined;
    const player = players?.find((p) => p.id === remotePlayerId);
    if (!player) return null;
    return {
      ...player,
      isActive: activePlayerIds?.includes(remotePlayerId) ?? false,
    };
  }, [isRemotePlayer, scene, remotePlayerId]);

  const dmOnline = useMemo(() => {
    if (!scene) return false;
    const dmLastSeen = (scene as Record<string, unknown>).dmLastSeen as number | undefined;
    if (typeof dmLastSeen !== "number") return false;
    return Date.now() - dmLastSeen < 45_000;
  }, [scene]);

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

  const effectiveIsGM = isGM && !isRemotePlayer;

  return (
    <>
      <GameCanvas
        mapUrl={scene.mapUrl}
        isGM={effectiveIsGM}
        sceneId={sceneId}
        remotePlayerId={remotePlayerId}
      />
      {effectiveIsGM && canSave && (
        <div className="pointer-events-none absolute right-4 top-16 z-30">
          <SaveStatusIndicator status={saveStatus} />
        </div>
      )}
      {isRemotePlayer && sceneId && (
        <RemotePlayerHud
          sceneId={sceneId}
          playerId={remotePlayerId}
          playerInfo={remotePlayerInfo}
          dmOnline={dmOnline}
        />
      )}
    </>
  );
}

export default ScenePage;
