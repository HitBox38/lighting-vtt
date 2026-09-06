import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { authorLabel } from "@/pages/EffectLibraryPage/helpers";

interface Props {
  effect: Doc<"effects">;
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
        <Badge variant="outline" className="text-[10px]">
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

/** One row in the library list. Clicking selects it for the detail pane. */
export function EffectCard({ effect, selected, mine, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(effect._id)}
      aria-pressed={selected}
      className={cn(
        "bg-card text-card-foreground hover:bg-accent/40 focus-visible:ring-ring flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2",
        selected && "border-primary bg-accent/60",
      )}
    >
      {effect.thumbnailUrl ? (
        <img
          src={effect.thumbnailUrl}
          alt=""
          width={320}
          height={180}
          loading="lazy"
          className="aspect-video w-full rounded-md object-cover"
        />
      ) : (
        <EffectGlyph
          item={{
            kind: "effect",
            effectId: effect._id,
            version: effect.latestVersion,
            name: effect.name,
          }}
          className="workshop-stage aspect-video w-full rounded-md text-amber-500"
        />
      )}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {effect.name}
        </span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          v{effect.latestVersion}
        </Badge>
        {mine ? kindBadge(effect.kind) : null}
        {mine ? visibilityBadge(effect.visibility) : null}
      </div>
      {effect.description ? (
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {effect.description}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs italic">No description</p>
      )}
      <span className="text-muted-foreground text-[11px]">
        by {authorLabel(effect, mine)}
      </span>
    </button>
  );
}
