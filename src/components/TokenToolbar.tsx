import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";

import { useTokenManager } from "@/hooks/useTokenManager";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import { HudSurface } from "@/components/hud/HudSurface";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [useBorderColor, setUseBorderColor] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateTokenFormValues>({
    defaultValues: defaultFormValues,
  });

  const resetForm = () => {
    reset(defaultFormValues);
    setUseBorderColor(true);
    setImageUrl("");
    setImageKey("");
  };

  const handleUseBorderColorChange = (checked: boolean) => {
    setUseBorderColor(checked);
    if (!checked) {
      setValue("borderColor", undefined);
      clearErrors("borderColor");
    } else {
      setValue("borderColor", "#ffffff");
    }
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
      useBorderColor &&
      validationResult.data.borderColor &&
      validationResult.data.borderColor.trim() !== ""
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

  const activePlacementTemplate = useMemo(() => {
    if (!placementTemplateId) {
      return null;
    }
    return tokenTemplates.find((template) => template.id === placementTemplateId) ?? null;
  }, [placementTemplateId, tokenTemplates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return tokenTemplates;
    }

    return tokenTemplates.filter((template) => template.name.toLowerCase().includes(normalizedQuery));
  }, [searchQuery, tokenTemplates]);

  const canSubmit = imageUrl.length > 0 && imageKey.length > 0 && !isUploading;
  const hasTemplates = tokenTemplates.length > 0;
  const searchPlaceholder = hasTemplates
    ? activePlacementTemplate
      ? `Placing: ${activePlacementTemplate.name}`
      : "Search token template…"
    : "No token templates yet";

  const handleSelectTemplate = (templateId: string) => {
    setPlacementTemplateId(templateId);
    setSearchQuery("");
  };

  const handleClearPlacement = () => {
    setPlacementTemplateId(null);
    setSearchQuery("");
  };

  const handleDeleteTemplate = async (templateId: string, imageKeyToDelete: string) => {
    if (placementTemplateId === templateId) {
      setPlacementTemplateId(null);
    }
    removeTokenTemplate(templateId);

    try {
      await deleteUploadedFile(imageKeyToDelete);
    } catch (error) {
      console.error("Failed to delete token template image:", error);
    }
  };

  return (
    <HudSurface className="items-center">
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
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="token-border-color-toggle" className="text-sm font-medium">
                  Border Color <span className="text-muted-foreground">(optional)</span>
                </label>
                <Switch
                  id="token-border-color-toggle"
                  checked={useBorderColor}
                  onCheckedChange={handleUseBorderColorChange}
                  aria-describedby={errors.borderColor ? "token-border-color-error" : undefined}
                />
              </div>
              {useBorderColor && (
                <>
                  <Input
                    id="token-border-color"
                    type="color"
                    className="h-10 w-16 cursor-pointer p-1"
                    {...register("borderColor")}
                  />
                  {errors.borderColor && (
                    <p id="token-border-color-error" className="text-sm text-destructive" role="alert">
                      {errors.borderColor.message}
                    </p>
                  )}
                </>
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

      <Autocomplete
        className="w-72 max-w-72"
        inputClassName="h-8"
        value={searchQuery}
        onValueChange={setSearchQuery}
        options={filteredTemplates}
        onSelectOption={(template) => handleSelectTemplate(template.id)}
        getOptionKey={(template) => template.id}
        isOptionSelected={(template) => placementTemplateId === template.id}
        placeholder={searchPlaceholder}
        disabled={!hasTemplates}
        emptyMessage={
          hasTemplates ? "No token templates match your search." : "No token templates yet"
        }
        name="tokenTemplateSearch"
        ariaLabel="Search token templates"
        leftAdornment={<Search className="size-4" />}
        rightAdornment={
          placementTemplateId ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClearPlacement}
              aria-label="Clear active token placement">
              <X className="size-3" aria-hidden="true" />
            </Button>
          ) : null
        }
        renderOption={({ option, optionId, isHighlighted, isSelected, selectOption }) => {
          const placedCount = tokenCountByTemplateId.get(option.id) ?? 0;

          return (
            <div className="flex items-center gap-1">
              <button
                id={optionId}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                  isHighlighted && "bg-accent/80",
                  isSelected && "ring-1 ring-primary/40"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={selectOption}
              >
                <img
                  src={option.imageUrl}
                  alt={option.name}
                  className="size-8 rounded-full object-cover"
                  style={{ border: `2px solid ${option.borderColor ?? "#ffffff"}` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{option.name}</p>
                  <p className="text-[11px] text-muted-foreground">{placedCount} placed</p>
                </div>
                {isSelected && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Active
                  </span>
                )}
              </button>

              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void handleDeleteTemplate(option.id, option.imageKey)}
                aria-label={`Delete token template ${option.name}`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        }}
      />
    </HudSurface>
  );
}

export default TokenToolbar;
