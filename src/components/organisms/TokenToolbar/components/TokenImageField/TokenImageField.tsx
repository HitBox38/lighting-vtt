import { useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteUploadedFile } from "@/utils/uploadthing";

interface TokenImageFieldProps {
  imageUrl: string;
  imageKey: string;
  isUploading: boolean;
  onFileSelected: (file: File) => void;
  onClearImage: () => void;
}

export function TokenImageField({
  imageUrl,
  imageKey,
  isUploading,
  onFileSelected,
  onClearImage,
}: TokenImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-2">
      <label htmlFor="token-image" className="text-sm font-medium">
        Token Image
      </label>
      <input
        id="token-image"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onFileSelected(file);
          }
        }}
      />
      {imageUrl ? (
        <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-border">
          <img src={imageUrl} alt="Token preview" className="h-full w-full object-cover" />
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            className="absolute top-1 right-1"
            aria-label="Remove token image"
            onClick={() => {
              onClearImage();
              if (imageKey) {
                void deleteUploadedFile(imageKey).catch((error) => {
                  console.error("Failed to delete token image:", error);
                });
              }
            }}>
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              Upload Image
            </>
          )}
        </Button>
      )}
    </div>
  );
}
