import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import { useState } from "react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { authorLabel, formatDate } from "@/pages/EffectLibraryPage/helpers";

interface Props {
  effect: Doc<"effects"> & { generatedThumbnailUrl?: string; thumbnailStatus?: string; thumbnailVersion?: number };
  selected: boolean;
  /** True when the signed-in user authored this effect. */
  mine: boolean;
  onSelect: (effectId: string) => void;
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
    <span className="relative isolate block aspect-[16/10] w-full overflow-hidden rounded-md bg-stone-950 text-amber-300 ring-1 ring-stone-900/10">
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
export function EffectCard({ effect, selected, mine, onSelect }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumbnailUrl = effect.generatedThumbnailUrl ?? effect.thumbnailUrl;
  const byline = authorLabel(effect, mine);
  return (
    <button
      type="button"
      onClick={() => onSelect(effect._id)}
      aria-pressed={selected}
      aria-label={`Preview ${effect.name} by ${byline}`}
      className={cn(
        "group bg-card text-card-foreground hover:border-amber-500/70 hover:bg-amber-500/5 focus-visible:ring-ring flex h-full w-full flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors outline-none focus-visible:ring-2",
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
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
        <p className="text-muted-foreground line-clamp-2 min-h-8 text-xs leading-4">
          {effect.description}
        </p>
      ) : (
        <p className="text-muted-foreground min-h-8 text-xs italic">
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
