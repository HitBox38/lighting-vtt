import { ImageIcon, Loader2, Upload } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import type { useCreateSceneForm } from "@/pages/LibraryPage/hooks/useCreateSceneForm";

type FormHandle = ReturnType<typeof useCreateSceneForm>;

interface MapImageFieldProps {
  form: FormHandle;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function MapImageField({ form, fileInputRef }: MapImageFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor="map-image-file" className="text-sm font-medium">
        Map Image
      </label>
      <input type="hidden" {...form.register("imageUrl", { required: "Please upload an image" })} />
      <input
        id="map-image-file"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={form.handleFileInputChange}
      />
      {form.imageUrl ? (
        <div className="relative overflow-hidden rounded-md border">
          <img src={form.imageUrl} alt="Uploaded map" className="h-32 w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={form.handleRemoveImage}
            disabled={form.isSubmitting}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={form.isUploading || form.isSubmitting}
            onClick={() => fileInputRef.current?.click()}>
            {form.isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose File
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">PNG, JPG, or WebP up to 4MB</p>
        </div>
      )}
      {form.errors.imageUrl ? (
        <p className="text-sm text-destructive">{form.errors.imageUrl.message}</p>
      ) : null}
    </div>
  );
}
