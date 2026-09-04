import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

interface ImageUploadButtonProps {
  onImageSelected: (url: string) => void;
}

export function ImageUploadButton({ onImageSelected }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    onImageSelected(url);
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button onClick={() => inputRef.current?.click()}>Upload Map</Button>
    </>
  );
}
