import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLightStore } from "@/stores/lightStore";
import type { SaveStatus } from "@/components/SaveStatusIndicator";
import type { Light, Mirror, UpdateSceneResponse } from "@shared/index";

const DEBOUNCE_DELAY = 2000; // 2 seconds
const SAVED_DISPLAY_DURATION = 2000; // Show "Saved" for 2 seconds

interface UseAutoSaveOptions {
  sceneId: string | null;
  creatorId: string | null;
  userId: string | null;
  enabled?: boolean;
}

interface UpdateSceneMutationParams {
  sceneId: string;
  creatorId: string;
  lights: Light[];
  mirrors: Mirror[];
  currentHash: string;
}

const updateSceneFn = async ({
  sceneId,
  creatorId,
  lights,
  mirrors,
}: UpdateSceneMutationParams): Promise<UpdateSceneResponse> => {
  const response = await fetch(`/api/scene/${sceneId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      creatorId,
      lightsState: lights,
      mirrorsState: mirrors,
    }),
  });

  const result = (await response.json()) as UpdateSceneResponse;

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
};

export function useAutoSave({ sceneId, creatorId, userId, enabled = true }: UseAutoSaveOptions) {
  const [displayStatus, setDisplayStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);

  // Check if user is allowed to save (must be the creator)
  const canSave = enabled && sceneId && userId && userId === creatorId;

  const mutation = useMutation({
    mutationFn: updateSceneFn,
    onSuccess: (_, variables) => {
      lastSavedHashRef.current = variables.currentHash;
      setDisplayStatus("saved");

      // Clear any existing saved timer
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }

      // Hide "Saved" status after duration
      savedTimerRef.current = setTimeout(() => {
        setDisplayStatus("idle");
      }, SAVED_DISPLAY_DURATION);
    },
    onError: (error) => {
      console.error("Auto-save failed:", error);
      setDisplayStatus("error");
    },
  });

  const saveScene = useCallback(() => {
    const state = useLightStore.getState();
    const currentHash = state.getStateHash();

    // Skip if nothing changed since last save
    if (currentHash === lastSavedHashRef.current) {
      return;
    }

    // Skip if initial state hasn't changed
    if (currentHash === state.initialStateHash && lastSavedHashRef.current === null) {
      return;
    }

    if (!sceneId || !userId) {
      return;
    }

    setDisplayStatus("saving");

    mutation.mutate({
      sceneId,
      creatorId: userId,
      lights: state.lights,
      mirrors: state.mirrors,
      currentHash,
    });
  }, [sceneId, userId, mutation]);

  // Subscribe to store changes and debounce saves
  useEffect(() => {
    if (!canSave) {
      return;
    }

    const unsubscribe = useLightStore.subscribe((state, prevState) => {
      // Only trigger save if lights or mirrors changed
      if (state.lights === prevState.lights && state.mirrors === prevState.mirrors) {
        return;
      }

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        saveScene();
      }, DEBOUNCE_DELAY);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [canSave, saveScene]);

  // Initialize lastSavedHash when scene loads
  useEffect(() => {
    if (sceneId) {
      const state = useLightStore.getState();
      lastSavedHashRef.current = state.initialStateHash;
    }
  }, [sceneId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  return {
    status: displayStatus,
    canSave: !!canSave,
    isSaving: mutation.isPending,
  };
}
