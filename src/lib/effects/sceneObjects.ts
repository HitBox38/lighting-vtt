import { useLightStore } from "@/stores/lightStore/lightStore";
import { createId } from "@/lib/createId";
import { EFFECT_LIMITS } from "@shared/effects";
import type { SceneSelection } from "./catalog";

/** Preserve the original order on undo; never restore into a different scene. */
export function removeSceneObject(ref: SceneSelection): (() => boolean) | null {
  const state = useLightStore.getState();
  const key =
    ref.kind === "light"
      ? "lights"
      : ref.kind === "mirror"
        ? "mirrors"
        : "effects";
  const index = state[key].findIndex((item) => item.id === ref.id);
  const object = state[key][index];
  if (!object) return null;
  if (ref.kind === "light") state.removeLight(ref.id);
  else if (ref.kind === "mirror") state.removeMirror(ref.id);
  else state.removeEffect(ref.id);
  return () => {
    const current = useLightStore.getState();
    if (
      current.sceneId !== state.sceneId ||
      current[key].some((item) => item.id === ref.id)
    )
      return false;
    if (
      key === "effects" &&
      current.effects.length >= EFFECT_LIMITS.maxInstancesPerScene
    )
      return false;
    const items = [...current[key]];
    items.splice(Math.min(index, items.length), 0, object);
    useLightStore.setState({ [key]: items });
    return true;
  };
}

export function duplicateSceneObject(
  ref: SceneSelection,
): SceneSelection | null {
  const state = useLightStore.getState();
  const id = createId();
  if (ref.kind === "light") {
    const item = state.lights.find((entry) => entry.id === ref.id);
    if (!item) return null;
    const copy = { ...item, id, locked: false, x: item.x + 30, y: item.y + 30 };
    if (copy.type !== "radial") {
      copy.targetX += 30;
      copy.targetY += 30;
    }
    useLightStore.setState({ lights: [...state.lights, copy] });
  } else if (ref.kind === "mirror") {
    const item = state.mirrors.find((entry) => entry.id === ref.id);
    if (!item) return null;
    useLightStore.setState({
      mirrors: [
        ...state.mirrors,
        {
          ...item,
          id,
          locked: false,
          x1: item.x1 + 30,
          x2: item.x2 + 30,
          y1: item.y1 + 30,
          y2: item.y2 + 30,
        },
      ],
    });
  } else {
    const item = state.effects.find((entry) => entry.id === ref.id);
    if (!item || state.effects.length >= EFFECT_LIMITS.maxInstancesPerScene)
      return null;
    useLightStore.setState({
      effects: [
        ...state.effects,
        {
          ...item,
          id,
          locked: false,
          x: item.x + 30,
          y: item.y + 30,
          params: { ...item.params },
        },
      ],
    });
  }
  return { kind: ref.kind, id };
}
