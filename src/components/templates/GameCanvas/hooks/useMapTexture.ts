import { useEffect, useState } from "react";
import { Assets, Texture as PixiTexture } from "pixi.js";

export function useMapTexture(mapUrl: string) {
  const [result, setResult] = useState<{ url: string; texture: PixiTexture | null; failed: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTexture = async () => {
      try {
        const isBlob = mapUrl.startsWith("blob:");
        const isUploadThing = mapUrl.includes(".ufs.sh/f/");
        const texture = await Assets.load({
          src: mapUrl,
          parser: isBlob || isUploadThing ? "loadTextures" : undefined,
        });
        if (isMounted) {
          setResult({ url: mapUrl, texture, failed: false });
        }
      } catch (error) {
        if (isMounted) setResult({ url: mapUrl, texture: null, failed: true });
        console.error("Failed to load texture:", error);
      }
    };

    void loadTexture();

    return () => {
      isMounted = false;
    };
  }, [mapUrl]);

  return { mapTexture: result?.url === mapUrl ? result.texture : null, mapFailed: result?.url === mapUrl && result.failed };
}
