import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import { useEffect, useState } from "react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { authorLabel, formatDate } from "@/pages/EffectLibraryPage/helpers";

export type EffectCardEffect = Doc<"effects"> & {
  generatedThumbnailUrl?: string;
  thumbnailStatus?: string;
  thumbnailVersion?: number;
};

interface Props {
  effect: EffectCardEffect;
  selected: boolean;
  /** True when the signed-in user authored this effect. */
  mine: boolean;
  onSelect: (effectId: string) => void;
  onShaderPreviewStart: (effect: EffectCardEffect, target: HTMLElement) => void;
  onShaderPreviewEnd: (effectId: string) => void;
}

function visibilityBadge(visibility: Doc<"effects">["visibility"]) {
  switch (visibility) {
    case "public":
      return <Badge variant="default">Public</Badge>;
    case "private":
      return <Badge variant="outline">Private</Badge>;
    case "hidden":
      return <Badge variant="destructive">Hidden</Badge>;
    default: {
      const exhaustive: never = visibility;
      throw new Error(`Unhandled visibility: ${String(exhaustive)}`);
    }
  }
}

function kindBadge(kind: Doc<"effects">["kind"]) {
  switch (kind) {
    case "shader":
      return (
        <Badge variant="outline" data-analytics-private className="text-[10px]">
          Shader
        </Badge>
      );
    case "script":
      return (
        <Badge variant="outline" className="text-[10px]">
          Script
        </Badge>
      );
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
    }
  }
}

function EffectThumbnail({
  effect,
  thumbnailUrl,
  failedUrl,
  onFailedUrl,
}: {
  effect: Props["effect"];
  thumbnailUrl: string | undefined;
  failedUrl: string | null;
  onFailedUrl: (url: string) => void;
}) {
  return (
    <span
      data-effect-thumb
      className="relative isolate block aspect-video w-full overflow-hidden rounded-md bg-stone-950 text-amber-300 ring-1 ring-stone-900/10 [contain:paint]"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_28%,rgba(251,191,36,0.32),transparent_34%),linear-gradient(135deg,rgba(120,113,108,0.24),rgba(28,25,23,0.96))]" />
      {thumbnailUrl && thumbnailUrl !== failedUrl ? (
        <img
          src={thumbnailUrl}
          onError={() => onFailedUrl(thumbnailUrl)}
          alt={`Preview of ${effect.name} effect`}
          width={320}
          height={200}
          loading="lazy"
          className="relative h-full w-full object-cover brightness-110 contrast-125 saturate-125"
        />
      ) : (
        <EffectGlyph
          item={{
            kind: "effect",
            effectId: effect._id,
            version: effect.latestVersion,
            name: effect.name,
          }}
          className="workshop-stage relative h-full w-full text-amber-300"
        />
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
      <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-amber-100/10" />
    </span>
  );
}

/** One compact library card. Clicking selects it for the detail pane. */
export function EffectCard({
  effect,
  selected,
  mine,
  onSelect,
  onShaderPreviewStart,
  onShaderPreviewEnd,
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumbnailUrl = effect.generatedThumbnailUrl ?? effect.thumbnailUrl;
  const byline = authorLabel(effect, mine);

  useEffect(
    () => () => onShaderPreviewEnd(effect._id),
    [effect._id, onShaderPreviewEnd],
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(effect._id)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && effect.kind === "shader") {
          const thumb = event.currentTarget.querySelector<HTMLElement>(
            "[data-effect-thumb]",
          );
          if (thumb) onShaderPreviewStart(effect, thumb);
        }
      }}
      onPointerLeave={() => onShaderPreviewEnd(effect._id)}
      onBlur={() => onShaderPreviewEnd(effect._id)}
      aria-pressed={selected}
      aria-label={`Preview ${effect.name} by ${byline}`}
      className={cn(
        "group bg-card text-card-foreground hover:border-amber-500/70 hover:bg-amber-500/5 focus-visible:ring-ring flex h-full w-full flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors outline-none focus-visible:ring-2",
        selected && "border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/15",
      )}
    >
      <EffectThumbnail
        effect={effect}
        thumbnailUrl={thumbnailUrl}
        failedUrl={failedUrl}
        onFailedUrl={setFailedUrl}
      />
      <div className="flex min-w-0 items-start gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {effect.name}
        </span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          v{effect.latestVersion}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {mine ? kindBadge(effect.kind) : null}
        {mine ? visibilityBadge(effect.visibility) : null}
        <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300">
          {effect.category ?? effect.publicCategory ?? "Other"}
        </Badge>
      </div>
      {effect.description ? (
        <p className="text-muted-foreground line-clamp-1 min-h-4 text-[11px] leading-4">
          {effect.description}
        </p>
      ) : (
        <p className="text-muted-foreground min-h-4 text-[11px] italic">
          No description
        </p>
      )}
      <span className="text-muted-foreground mt-auto flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate">by {byline}</span>
        <span className="shrink-0 tabular-nums">{formatDate(effect.updatedAt)}</span>
      </span>
    </button>
  );
}
