import GameCanvas from "@/components/GameCanvas";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { useState } from "react";

function App() {
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  return (
    <>
      {!mapUrl && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <ImageUploadButton onImageSelected={setMapUrl} />
        </div>
      )}
      {mapUrl && <GameCanvas mapUrl={mapUrl} />}
    </>
  );
}

export default App;
