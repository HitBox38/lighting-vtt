import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { EffectPreview } from "@/components/organisms/EffectPreview";
import type { PreviewHandle } from "@/components/organisms/EffectPreview/EffectPreview";
import { defaultParamValues, type EffectDefinition } from "@shared/effects";

// Only the four curated starters enter this cache; keep their stills for this visit.
const stills = new Map<string, string>();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    for (const url of stills.values()) URL.revokeObjectURL(url);
    stills.clear();
  });

export function StarterThumbnail({
  definition,
}: {
  definition: EffectDefinition;
}) {
  const captureRef = useRef<PreviewHandle | null>(null);
  const [src, setSrc] = useState(() => stills.get(definition.name));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ready || src) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void captureRef.current
        ?.capture()
        .then((blob) => {
          if (cancelled) return;
          if (!blob) {
            setFailed(true);
            return;
          }
          const url = URL.createObjectURL(blob);
          stills.set(definition.name, url);
          setSrc(url);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, src, definition.name]);
  if (src)
    return <img src={src} alt="" className="h-full w-full object-cover" />;
  if (failed)
    return (
      <div className="workshop-stage flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-5" />
        Preview unavailable
      </div>
    );
  return (
    <EffectPreview
      captureRef={captureRef}
      definition={definition}
      params={defaultParamValues(definition.params)}
      preference="webgl"
      paused
      environment="grid"
      className="h-full w-full"
      onCompiled={(result) =>
        result.status === "ok" ? setReady(true) : setFailed(true)
      }
      onScript={(result) =>
        result.status === "ok" ? setReady(true) : setFailed(true)
      }
    />
  );
}
