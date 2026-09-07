import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff, Pause, Play, RotateCcw } from "lucide-react";
import { EffectPreview } from "./EffectPreview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function PreviewStage({
  fill = false,
  status,
  ...props
}: ComponentProps<typeof EffectPreview> & {
  fill?: boolean;
  status?: ReactNode;
}) {
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
    <div className={cn("space-y-2", fill && "flex min-h-48 flex-1 flex-col")}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Select
          value={environment}
          onValueChange={(value) => setEnvironment(value as typeof environment)}
        >
          <SelectTrigger
            size="sm"
            className="min-w-0 text-xs"
            aria-label="Preview environment"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="room">Dim Room</SelectItem>
            <SelectItem value="lights">Lights & Mirrors</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/20 p-0.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label={paused ? "Play preview" : "Pause preview"}
            title={paused ? "Play preview" : "Pause preview"}
            className="size-7"
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
            title="Restart preview"
            className="size-7"
            onClick={() => setRestart(restart + 1)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="sm"
            variant={enabled ? "secondary" : "outline"}
            aria-pressed={enabled}
            title="Compare the scene with and without this effect"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
            {enabled ? "Effect on" : "Effect off"}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border",
          fill ? "min-h-24 flex-1" : "aspect-[4/3] max-h-[48vh]",
        )}
      >
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <Select
          value={preference}
          onValueChange={(value) => setPreference(value as typeof preference)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Preview renderer"
            className="border-transparent bg-transparent px-1 text-[11px] shadow-none hover:border-border dark:bg-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webgl">WebGL</SelectItem>
            <SelectItem value="webgpu">WebGPU</SelectItem>
          </SelectContent>
        </Select>
        {status ?? (
          <span>{paused ? "Paused" : "Live preview"} · this browser</span>
        )}
      </div>
      {environment === "lights" ? (
        <details className="shrink-0 rounded-lg border p-3 text-xs">
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
