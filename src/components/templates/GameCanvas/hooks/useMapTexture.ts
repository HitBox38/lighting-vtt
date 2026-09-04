import { useEffect, useState } from "react";
import { Assets, Texture as PixiTexture } from "pixi.js";

export function useMapTexture(mapUrl: string) {
  const [mapTexture, setMapTexture] = useState<PixiTexture | null>(null);

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
          setMapTexture(texture);
        }
      } catch (error) {
        console.error("Failed to load texture:", error);
      }
    };

    void loadTexture();

    return () => {
      isMounted = false;
    };
  }, [mapUrl]);

  return mapTexture;
}
