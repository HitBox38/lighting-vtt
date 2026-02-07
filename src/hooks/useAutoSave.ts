import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useLightStore } from "@/stores/lightStore";
import type { SaveStatus } from "@/components/SaveStatusIndicator";

const DEBOUNCE_DELAY = 2000;
const SAVED_DISPLAY_DURATION = 2000;

interface UseAutoSaveOptions {
  sceneId: string | null;
  creatorId: string | null;
  userId: string | null;
  enabled?: boolean;
}

export function useAutoSave({ sceneId, creatorId, userId, enabled = true }: UseAutoSaveOptions) {
  const [displayStatus, setDisplayStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);

  const canSave = enabled && sceneId && userId && userId === creatorId;

  const updateScene = useMutation(api.scenes.update);

  const saveScene = useCallback(() => {
    const state = useLightStore.getState();
    const currentHash = state.getStateHash();

    if (currentHash === lastSavedHashRef.current) {
      return;
    }

    if (currentHash === state.initialStateHash && lastSavedHashRef.current === null) {
      return;
    }

    if (!sceneId || !userId) {
      return;
    }

    setDisplayStatus("saving");

    updateScene({
      id: sceneId as Id<"scenes">,
      creatorId: userId,
      lights: state.lights,
      mirrors: state.mirrors,
    })
      .then(() => {
        lastSavedHashRef.current = currentHash;
        setDisplayStatus("saved");

        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }

        savedTimerRef.current = setTimeout(() => {
          setDisplayStatus("idle");
        }, SAVED_DISPLAY_DURATION);
      })
      .catch((error) => {
        console.error("Auto-save failed:", error);
        setDisplayStatus("error");
      });
  }, [sceneId, userId, updateScene]);

  useEffect(() => {
    if (!canSave) {
      return;
    }

    const unsubscribe = useLightStore.subscribe((state, prevState) => {
      if (state.lights === prevState.lights && state.mirrors === prevState.mirrors) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

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

  useEffect(() => {
    if (sceneId) {
      const state = useLightStore.getState();
      lastSavedHashRef.current = state.initialStateHash;
    }
  }, [sceneId]);

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
    isSaving: displayStatus === "saving",
  };
}
