import { useEffect, useState } from "react";
import { Assets, Texture as PixiTexture } from "pixi.js";
import type { TokenTemplate } from "@shared/index";

export function useTokenTextures(templates: TokenTemplate[]) {
  const [textures, setTextures] = useState<Record<string, PixiTexture>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = templates.filter((template) => !textures[template.id]);
    if (!missing.length) {
      return;
    }

    void (async () => {
      const loadedEntries = await Promise.all(
        missing.map(async (template) => {
          try {
            const texture = await Assets.load({
              src: template.imageUrl,
              parser: "loadTextures",
            });
            return [template.id, texture] as const;
          } catch (error) {
            console.error("Failed to load token texture:", error);
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const loaded: Record<string, PixiTexture> = {};
      for (const entry of loadedEntries) {
        if (entry) {
          loaded[entry[0]] = entry[1];
        }
      }
      if (Object.keys(loaded).length === 0) {
        return;
      }
      setTextures((prev) => ({ ...prev, ...loaded }));
    })();

    return () => {
      cancelled = true;
    };
  }, [templates, textures]);

  return textures;
}
