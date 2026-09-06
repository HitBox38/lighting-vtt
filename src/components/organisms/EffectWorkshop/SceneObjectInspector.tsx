import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { Copy, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EffectParamFields } from "@/components/molecules/EffectParamFields";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useWorkshopStore } from "@/stores/workshopStore";
import { useEffectManager } from "@/stores/lightStore/hooks/useEffectManager";
import {
  useEffectDefinitions,
  effectRefKey,
} from "@/lib/effects/hooks/useEffectDefinitions";
import { LIGHT_NAMES, type SceneSelection } from "@/lib/effects/catalog";
import {
  duplicateSceneObject,
  removeSceneObject,
} from "@/lib/effects/sceneObjects";
import { effectEditorPath } from "@/lib/effects/routes";
import { defaultParamValues } from "@shared/effects";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import { describeEffectStatus } from "@/components/molecules/EffectContextMenu/helpers";

function NumberControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input
        aria-label={label}
        type="number"
        value={Number(value.toFixed(3))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const n = event.target.valueAsNumber;
          if (
            Number.isFinite(n) &&
            (min === undefined || n >= min) &&
            (max === undefined || n <= max)
          )
            onChange(n);
        }}
      />
    </label>
  );
}

export function SceneObjectInspector({
  selection,
}: {
  selection: SceneSelection;
}) {
  const state = useLightStore(
    useShallow((s) => ({
      lights: s.lights,
      mirrors: s.mirrors,
      effects: s.effects,
      sceneId: s.sceneId,
      updateLight: s.updateLight,
      updateMirror: s.updateMirror,
      updateEffect: s.updateEffect,
    })),
  );
  const location = useLocation();
  const select = useWorkshopStore((s) => s.select);
  const { changeVersion } = useEffectManager();
  const light =
    selection.kind === "light"
      ? state.lights.find((e) => e.id === selection.id)
      : undefined;
  const mirror =
    selection.kind === "mirror"
      ? state.mirrors.find((e) => e.id === selection.id)
      : undefined;
  const effect =
    selection.kind === "effect"
      ? state.effects.find((e) => e.id === selection.id)
      : undefined;
  const instances = useMemo(() => (effect ? [effect] : []), [effect]);
  const { definitions } = useEffectDefinitions(instances, state.sceneId);
  const definition = effect
    ? definitions.get(effectRefKey(effect.effectId, effect.version))
    : undefined;
  const versions = useQuery(
    api.effects.listVersions,
    effect ? { effectId: effect.effectId } : "skip",
  );
  const status = useEffectRuntimeStore((s) => s.statuses[selection.id]);
  const enable = useEffectRuntimeStore((s) => s.enableInstance);
  const item = light ?? mirror ?? effect;
  if (!item)
    return (
      <div className="p-5 text-sm">
        <p>This object is no longer in the scene.</p>
        <Button variant="ghost" onClick={() => select(null)}>
          Back to scene objects
        </Button>
      </div>
    );
  const title = light
    ? LIGHT_NAMES[light.type]
    : mirror
      ? "Mirror"
      : (definition?.name ?? "Effect");
  const updateFlags = (patch: { hidden?: boolean; locked?: boolean }) => {
    if (light) state.updateLight(light.id, patch);
    else if (mirror) state.updateMirror(mirror.id, patch);
    else if (effect) state.updateEffect(effect.id, patch);
  };
  const statusText = effect ? describeEffectStatus(status) : null;
  return (
    <div className="space-y-5 p-4">
      <Button variant="ghost" size="sm" onClick={() => select(null)}>
        <ArrowLeft className="size-4" /> In scene
      </Button>
      <div>
        <p className="workshop-eyebrow">Selected object</p>
        <h3 className="text-xl font-semibold">{title}</h3>
        {effect ? (
          <p className="text-xs text-muted-foreground">
            Pinned to version {effect.version}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = duplicateSceneObject(selection);
            if (next) select(next);
            else
              toast.error("Could not duplicate. Check the scene effect limit.");
          }}
        >
          <Copy className="size-4" /> Duplicate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const undo = removeSceneObject(selection);
            select(null);
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
          }}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>
      <div className="space-y-3 border-y py-3">
        <label className="flex items-center justify-between text-sm">
          Visible to players
          <input
            type="checkbox"
            checked={!item.hidden}
            onChange={(e) => updateFlags({ hidden: !e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          Lock editing
          <input
            type="checkbox"
            checked={item.locked ?? false}
            onChange={(e) => updateFlags({ locked: e.target.checked })}
          />
        </label>
      </div>
      {light ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberControl
              label="X"
              value={light.x}
              disabled={item.locked}
              onChange={(x) => state.updateLight(light.id, { x })}
            />
            <NumberControl
              label="Y"
              value={light.y}
              disabled={item.locked}
              onChange={(y) => state.updateLight(light.id, { y })}
            />
            <NumberControl
              label={light.type === "line" ? "Width" : "Radius"}
              min={1}
              value={light.radius}
              disabled={item.locked}
              onChange={(radius) => state.updateLight(light.id, { radius })}
            />
            <NumberControl
              label="Intensity"
              min={0}
              max={1}
              step={0.05}
              value={light.intensity}
              disabled={item.locked}
              onChange={(intensity) =>
                state.updateLight(light.id, { intensity })
              }
            />
            {light.type !== "radial" ? (
              <>
                <NumberControl
                  label="Target X"
                  value={light.targetX}
                  disabled={item.locked}
                  onChange={(targetX) =>
                    state.updateLight(light.id, { targetX })
                  }
                />
                <NumberControl
                  label="Target Y"
                  value={light.targetY}
                  disabled={item.locked}
                  onChange={(targetY) =>
                    state.updateLight(light.id, { targetY })
                  }
                />
              </>
            ) : null}
            {light.type === "conic" ? (
              <NumberControl
                label="Cone angle"
                min={1}
                max={360}
                value={light.coneAngle}
                disabled={item.locked}
                onChange={(coneAngle) =>
                  state.updateLight(light.id, { coneAngle })
                }
              />
            ) : null}
          </div>
          <label className="flex items-center justify-between text-sm">
            Light color
            <input
              aria-label="Light color"
              type="color"
              value={light.color.slice(0, 7)}
              disabled={item.locked}
              onChange={(e) =>
                state.updateLight(light.id, { color: e.target.value })
              }
            />
          </label>
        </>
      ) : null}
      {mirror ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(["x1", "y1", "x2", "y2"] as const).map((key) => (
              <NumberControl
                key={key}
                label={`Endpoint ${key[1]} ${key[0].toUpperCase()}`}
                value={mirror[key]}
                disabled={item.locked}
                onChange={(value) =>
                  state.updateMirror(mirror.id, { [key]: value })
                }
              />
            ))}
          </div>
          <label className="flex items-center justify-between text-sm">
            Keep mirror length
            <input
              type="checkbox"
              checked={mirror.fixedWidth ?? false}
              disabled={item.locked}
              onChange={(e) =>
                state.updateMirror(mirror.id, { fixedWidth: e.target.checked })
              }
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Reflects light along this segment. Move the endpoints to aim the
            reflection.
          </p>
        </>
      ) : null}
      {effect ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberControl
              label="X"
              value={effect.x}
              disabled={item.locked}
              onChange={(x) => state.updateEffect(effect.id, { x })}
            />
            <NumberControl
              label="Y"
              value={effect.y}
              disabled={item.locked}
              onChange={(y) => state.updateEffect(effect.id, { y })}
            />
            <NumberControl
              label="Radius"
              min={8}
              max={4000}
              value={effect.radius}
              disabled={item.locked}
              onChange={(radius) => state.updateEffect(effect.id, { radius })}
            />
            <NumberControl
              label="Rotation (degrees)"
              value={(effect.rotation * 180) / Math.PI}
              disabled={item.locked}
              onChange={(rotation) =>
                state.updateEffect(effect.id, {
                  rotation: (rotation * Math.PI) / 180,
                })
              }
            />
          </div>
          {definition ? (
            <>
              <EffectParamFields
                params={definition.params}
                values={effect.params}
                disabled={item.locked}
                onChange={(params) => state.updateEffect(effect.id, { params })}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={item.locked}
                onClick={() =>
                  state.updateEffect(effect.id, {
                    params: defaultParamValues(definition.params),
                  })
                }
              >
                Reset controls
              </Button>
            </>
          ) : null}
          <div className="rounded-lg border p-3 text-xs" role="status">
            <p className="font-medium">{statusText?.label}</p>
            <p className="mt-1 text-muted-foreground">
              {statusText?.detail ?? "Changes apply to this instance only."}
            </p>
            {status?.kind === "disabled" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => enable(effect.id)}
              >
                Try again
              </Button>
            ) : null}
          </div>
          <label className="block space-y-2 text-xs">
            Version
            <select
              className="workshop-select"
              value={effect.version}
              disabled={item.locked || !versions?.length}
              onChange={(e) => {
                void changeVersion(effect.id, Number(e.target.value))
                  .then((result) => {
                    if (!result.ok) toast.error("That version is unavailable.");
                  })
                  .catch(() =>
                    toast.error("Could not change version. Try again."),
                  );
              }}
            >
              {(versions ?? [{ version: effect.version }]).map((v, i) => (
                <option key={v.version} value={v.version}>
                  v{v.version}
                  {i === 0 ? " · latest available" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button asChild variant="outline" className="w-full">
            <Link
              to={effectEditorPath(
                effect.effectId,
                effect.version,
                `${location.pathname}${location.search}`,
              )}
            >
              Open in studio
            </Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}
