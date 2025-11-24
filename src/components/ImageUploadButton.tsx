import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface ImageUploadButtonProps {
  onImageSelected: (url: string) => void;
}

export function ImageUploadButton({ onImageSelected }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelected(url);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
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
      <Button onClick={handleClick}>Upload Map</Button>
    </>
  );
}
