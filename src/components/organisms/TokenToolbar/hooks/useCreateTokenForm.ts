import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { useForm } from "react-hook-form";

import {
  createTokenFormSchema,
  defaultCreateTokenFormValues,
  type CreateTokenFormValues,
} from "@/components/organisms/TokenToolbar/constants";
import { useTokenManager } from "@/stores/tokenStore/hooks/useTokenManager";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useDeleteUploadedFile, useUploadThing } from "@/utils/uploadthing";

export function useCreateTokenForm() {
  const deleteUploadedFile = useDeleteUploadedFile();
  const posthog = usePostHog();
  const { addTokenTemplate } = useTokenManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [useBorderColor, setUseBorderColor] = useState(true);
  const form = useForm<CreateTokenFormValues>({ defaultValues: defaultCreateTokenFormValues });

  const resetForm = () => {
    form.reset(defaultCreateTokenFormValues);
    setUseBorderColor(true);
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

  const onSubmit = (data: CreateTokenFormValues) => {
    const validationResult = createTokenFormSchema.safeParse(data);
    if (!validationResult.success) {
      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "borderColor") {
          form.setError(field, { type: "manual", message: issue.message });
        }
      }
      return;
    }
    form.clearErrors(["name", "borderColor"]);
    if (!imageUrl || !imageKey) {
      return;
    }
    const borderColor =
      useBorderColor && validationResult.data.borderColor?.trim()
        ? validationResult.data.borderColor.trim()
        : undefined;
    addTokenTemplate({
      name: validationResult.data.name,
      imageUrl,
      imageKey,
      ...(borderColor !== undefined && { borderColor }),
    });
    posthog.capture(ANALYTICS_EVENTS.TokenTemplateCreated, { has_image: true });
    resetForm();
    setIsDialogOpen(false);
  };

  const cleanupDraftUpload = async () => {
    if (!imageKey) return;
    try {
      await deleteUploadedFile(imageKey);
    } catch (error) {
      console.error("Failed to delete draft token image:", error);
    }
  };

  return {
    form,
    isDialogOpen,
    setIsDialogOpen,
    imageUrl,
    imageKey,
    useBorderColor,
    setUseBorderColor,
    isUploading,
    startUpload,
    resetForm,
    onSubmit,
    cleanupDraftUpload,
    clearImage: () => {
      setImageUrl("");
      setImageKey("");
    },
    setImageKey,
  };
}
