import GameCanvas from "@/components/GameCanvas";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const MAP_URL_STORAGE_KEY = "lighting-vtt-map-url";

export function ScenePage() {
  const [searchParams] = useSearchParams();

  const isGM = useMemo(() => searchParams.get("isGM") !== "false", [searchParams]);

  const [mapUrl, setMapUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    if (!isGM) {
      return localStorage.getItem(MAP_URL_STORAGE_KEY);
    }
    return null;
  });

  const handleMapUrlChange = useCallback(
    (url: string) => {
      setMapUrl(url);
      if (isGM) {
        localStorage.setItem(MAP_URL_STORAGE_KEY, url);
      }
    },
    [isGM]
  );

  // Player windows should listen for storage events to know when GM loads a map.
  useEffect(() => {
    if (isGM || typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === MAP_URL_STORAGE_KEY && event.newValue) {
        setMapUrl(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isGM]);

  return (
    <>
      {!mapUrl && isGM && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <ImageUploadButton onImageSelected={handleMapUrlChange} />
        </div>
      )}
      {!mapUrl && !isGM && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
          <p>Waiting for GM to load a map...</p>
        </div>
      )}
      {mapUrl && <GameCanvas mapUrl={mapUrl} isGM={isGM} />}
    </>
  );
}

export default ScenePage;
