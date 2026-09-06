import { useState, type ComponentProps } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { EffectPreview } from "./EffectPreview";
import { Button } from "@/components/ui/button";

export function PreviewStage(props: ComponentProps<typeof EffectPreview>) {
  const [environment, setEnvironment] = useState<"grid" | "room" | "lights">(
    "grid",
  );
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [enabled, setEnabled] = useState(true);
  const [restart, setRestart] = useState(0);
  const [preference, setPreference] = useState<"webgl" | "webgpu">("webgl");
  const [sample, setSample] = useState({
    lightX: 180,
    lightY: 270,
    mirrorX: 860,
    mirrorY: 760,
  });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="min-w-0 text-xs">
          <span className="sr-only">Preview environment</span>
          <select
            className="workshop-select"
            value={environment}
            onChange={(e) =>
              setEnvironment(e.target.value as typeof environment)
            }
          >
            <option value="grid">Grid</option>
            <option value="room">Dim Room</option>
            <option value="lights">Lights & Mirrors</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="sr-only">Preview renderer</span>
          <select
            className="workshop-select"
            value={preference}
            onChange={(e) => setPreference(e.target.value as typeof preference)}
          >
            <option value="webgl">WebGL</option>
            <option value="webgpu">WebGPU</option>
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={paused ? "Play preview" : "Pause preview"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Restart preview"
            onClick={() => setRestart(restart + 1)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="sm"
            variant={enabled ? "secondary" : "outline"}
            aria-pressed={enabled}
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? "Effect on" : "Effect off"}
          </Button>
        </div>
      </div>
      <div className="relative aspect-[4/3] max-h-[48vh] overflow-hidden rounded-xl border">
        <EffectPreview
          key={`${preference}:${restart}`}
          {...props}
          preference={preference}
          className="h-full w-full"
          paused={paused}
          enabled={enabled}
          restart={restart}
          environment={environment}
          sample={sample}
        />
      </div>
      {environment === "lights" ? (
        <details className="rounded-lg border p-3 text-xs">
          <summary className="cursor-pointer font-medium">
            Move sample light & mirror
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["lightX", "lightY", "mirrorX", "mirrorY"] as const).map(
              (key) => (
                <label key={key} className="space-y-1">
                  <span>
                    {key.startsWith("light") ? "Light" : "Mirror endpoint"}{" "}
                    {key.endsWith("X") ? "X" : "Y"}
                  </span>
                  <input
                    className="w-full accent-amber-500"
                    type="range"
                    min={50}
                    max={950}
                    value={sample[key]}
                    onChange={(e) =>
                      setSample({ ...sample, [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ),
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
