import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Upload, X } from "lucide-react";

import { useTokenManager } from "@/hooks/useTokenManager";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const createTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  borderColor: z
    .string()
    .regex(HEX_COLOR, "Border color must be a valid hex string")
    .optional(),
});

type CreateTokenFormValues = z.infer<typeof createTokenFormSchema>;

const defaultFormValues: CreateTokenFormValues = {
  name: "",
  borderColor: "#ffffff",
};

async function deleteUploadedFile(key: string): Promise<void> {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  await fetch(`${convexUrl}/api/uploadthing/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

export function TokenToolbar() {
  const {
    tokenTemplates,
    tokens,
    placementTemplateId,
    addTokenTemplate,
    removeTokenTemplate,
    setPlacementTemplateId,
  } = useTokenManager();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateTokenFormValues>({
    defaultValues: defaultFormValues,
  });

  const resetForm = () => {
    reset(defaultFormValues);
    setImageUrl("");
    setImageKey("");
  };

  const clearImage = () => {
    setImageUrl("");
    setImageKey("");
  };

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (result) => {
      const file = result?.[0];
      if (!file?.ufsUrl || !file?.key) {
        return;
      }
      setImageUrl(file.ufsUrl);
      setImageKey(file.key);
    },
    onUploadError: (error) => {
      console.error("Token image upload failed:", error);
    },
  });

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void startUpload([file]);
  };

  const onSubmit = (data: CreateTokenFormValues) => {
    const validationResult = createTokenFormSchema.safeParse(data);
    if (!validationResult.success) {
      const nameIssue = validationResult.error.issues.find((issue) => issue.path[0] === "name");
      const borderColorIssue = validationResult.error.issues.find(
        (issue) => issue.path[0] === "borderColor"
      );

      if (nameIssue?.message) {
        setError("name", { type: "manual", message: nameIssue.message });
      }
      if (borderColorIssue?.message) {
        setError("borderColor", { type: "manual", message: borderColorIssue.message });
      }
      return;
    }

    clearErrors(["name", "borderColor"]);

    if (!imageUrl || !imageKey) {
      return;
    }
    const trimmedName = validationResult.data.name;
    const borderColor =
      validationResult.data.borderColor && validationResult.data.borderColor.trim() !== ""
        ? validationResult.data.borderColor.trim()
        : undefined;

    addTokenTemplate({
      name: trimmedName,
      imageUrl,
      imageKey,
      ...(borderColor !== undefined && { borderColor }),
    });
    resetForm();
    setIsDialogOpen(false);
  };

  const cleanupDraftUpload = async () => {
    const key = imageKey;
    if (!key) {
      return;
    }
    try {
      await deleteUploadedFile(key);
    } catch (error) {
      console.error("Failed to delete draft token image:", error);
    }
  };

  const handleRemoveSelectedImage = async () => {
    const key = imageKey;
    clearImage();
    if (!key) {
      return;
    }
    try {
      await deleteUploadedFile(key);
    } catch (error) {
      console.error("Failed to delete token image:", error);
    }
  };

  const tokenCountByTemplateId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const token of tokens) {
      counts.set(token.templateId, (counts.get(token.templateId) ?? 0) + 1);
    }
    return counts;
  }, [tokens]);

  const canSubmit = imageUrl.length > 0 && imageKey.length > 0 && !isUploading;

  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur">
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setIsDialogOpen(open);
        }}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="mr-2 size-4" />
            New Token
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Token Template</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="token-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="token-name"
                placeholder="Goblin, Chest, Hero..."
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="token-border-color" className="text-sm font-medium">
                Border Color <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="token-border-color"
                type="color"
                className="h-10 w-16 cursor-pointer p-1"
                {...register("borderColor")}
              />
              {errors.borderColor && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.borderColor.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Token Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              {imageUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-border">
                  <img
                    src={imageUrl}
                    alt="Token preview"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    className="absolute right-1 top-1"
                    onClick={() => void handleRemoveSelectedImage()}>
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
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void cleanupDraftUpload();
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="max-h-28 min-w-64 space-y-2 overflow-y-auto pr-1">
        {tokenTemplates.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            No token templates yet
          </div>
        ) : (
          tokenTemplates.map((template) => {
            const isPlacing = placementTemplateId === template.id;
            const placedCount = tokenCountByTemplateId.get(template.id) ?? 0;
            return (
              <div
                key={template.id}
                className="flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5">
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="size-8 rounded-full object-cover"
                  style={{ border: `2px solid ${template.borderColor}` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{template.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {placedCount} placed
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isPlacing ? "secondary" : "outline"}
                  onClick={() =>
                    setPlacementTemplateId(isPlacing ? null : template.id)
                  }>
                  {isPlacing ? "Cancel" : "Place"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (isPlacing) {
                      setPlacementTemplateId(null);
                    }
                    removeTokenTemplate(template.id);
                    try {
                      await deleteUploadedFile(template.imageKey);
                    } catch (error) {
                      console.error(
                        "Failed to delete token template image:",
                        error
                      );
                    }
                  }}>
                  Delete
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TokenToolbar;
