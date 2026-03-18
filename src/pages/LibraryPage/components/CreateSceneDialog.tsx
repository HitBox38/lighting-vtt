import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, ImageIcon, Upload } from "lucide-react";
import type { useCreateSceneForm } from "../hooks/useCreateSceneForm";

type FormHandle = ReturnType<typeof useCreateSceneForm>;

interface CreateSceneDialogProps {
  form: FormHandle;
}

/**
 * The "New Scene" button + dialog.
 * All form state is owned by the `useCreateSceneForm` hook.
 * The file input ref lives here (not in the hook) to satisfy React Compiler.
 */
export function CreateSceneDialog({ form }: CreateSceneDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={form.isDialogOpen}
      onOpenChange={form.handleDialogOpenChange}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Scene
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Scene</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(form.onSubmit)}
          className="grid gap-4 py-4"
        >
          {/* Scene name */}
          <div className="grid gap-2">
            <label htmlFor="scene-name" className="text-sm font-medium">
              Scene Name
            </label>
            <Input
              id="scene-name"
              placeholder="Enter scene name..."
              autoFocus
              disabled={form.isSubmitting}
              aria-invalid={!!form.errors.name}
              {...form.register("name", {
                required: "Scene name is required",
                validate: (value) =>
                  value.trim().length > 0 || "Scene name cannot be empty",
              })}
            />
            {form.errors.name && (
              <p className="text-sm text-destructive">
                {form.errors.name.message}
              </p>
            )}
          </div>

          {/* Map image upload */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Map Image</label>
            <input
              type="hidden"
              {...form.register("imageUrl", {
                required: "Please upload an image",
              })}
            />

            {/* Hidden native file input -- triggered by our Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={form.handleFileInputChange}
            />

            {form.imageUrl ? (
              <div className="relative rounded-md border overflow-hidden">
                <img
                  src={form.imageUrl}
                  alt="Uploaded map"
                  className="w-full h-32 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={form.handleRemoveImage}
                  disabled={form.isSubmitting}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-md border border-dashed">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={form.isUploading || form.isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose File
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or WebP up to 4MB
                </p>
              </div>
            )}
            {form.errors.imageUrl && (
              <p className="text-sm text-destructive">
                {form.errors.imageUrl.message}
              </p>
            )}
          </div>

          {form.errors.root && (
            <p className="text-sm text-destructive">
              {form.errors.root.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleCancel}
              disabled={form.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.isSubmitting || form.isUploading}>
              {form.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Scene"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
