import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUploadThing } from "@/utils/uploadthing";
import { ANALYTICS_EVENTS, setSceneEntrySource } from "@/lib/analytics";
import type { NewSceneFormData } from "../types";

/**
 * Encapsulates all state and handlers for the "Create New Scene" dialog:
 * form validation, image upload lifecycle (via useUploadThing), and Convex
 * mutation.
 *
 * Returns everything the `CreateSceneDialog` component needs to render and
 * everything the parent needs to open/close the dialog.
 *
 * NOTE: The hidden file `<input>` ref lives in the component, not here,
 * because React Compiler flags ref access on hook return objects.
 */
export function useCreateSceneForm(userId: string | undefined) {
  const navigate = useNavigate();
  const posthog = usePostHog();

  // ---- Dialog open state ----------------------------------------------------
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ---- Uploaded file tracking (for cleanup on cancel) -----------------------
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    key: string;
  } | null>(null);

  // ---- React Hook Form ------------------------------------------------------
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    control,
  } = useForm<NewSceneFormData>({
    defaultValues: { name: "", imageUrl: "" },
  });

  const imageUrl = useWatch({ control, name: "imageUrl" });

  // ---- Convex mutation ------------------------------------------------------
  const createScene = useMutation(api.scenes.create);

  // ---- UploadThing hook -----------------------------------------------------
  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      const file = res?.[0];
      if (file?.ufsUrl && file?.key) {
        setValue("imageUrl", file.ufsUrl, { shouldValidate: true });
        setUploadedFile({ url: file.ufsUrl, key: file.key });
        clearErrors("imageUrl");
        posthog.capture(ANALYTICS_EVENTS.CreateSceneUploadCompleted);
      }
    },
    onUploadError: (error) => {
      posthog.capture(ANALYTICS_EVENTS.CreateSceneUploadFailed, {
        error_category: error.message.slice(0, 120),
      });
      setError("imageUrl", {
        message: `Upload failed: ${error.message}`,
      });
    },
  });

  // ---- Helpers --------------------------------------------------------------

  /** Delete the currently-uploaded file from UploadThing, if any. */
  const deleteCurrentUpload = async () => {
    if (!uploadedFile?.key) {
      setUploadedFile(null);
      return;
    }
    const keyToDelete = uploadedFile.key;
    setUploadedFile(null);
    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      await fetch(`${convexUrl}/api/uploadthing/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToDelete }),
      });
    } catch (error) {
      console.error("Failed to delete upload", error);
    }
  };

  // ---- Public handlers ------------------------------------------------------

  /** Called when the user picks a file from the native dialog. */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected if removed
    e.target.value = "";

    posthog.capture(ANALYTICS_EVENTS.CreateSceneUploadStarted);
    void startUpload([file]);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      posthog.capture(ANALYTICS_EVENTS.CreateSceneDialogOpened);
    }
    if (!open) {
      void deleteCurrentUpload();
      reset();
    }
  };

  const onSubmit = async (data: NewSceneFormData) => {
    if (!userId) {
      setError("root", {
        message: "You must be signed in to create a scene",
      });
      return;
    }

    try {
      const newId = await createScene({
        creatorId: userId,
        name: data.name.trim(),
        mapUrl: data.imageUrl,
      });

      posthog.capture(ANALYTICS_EVENTS.SceneCreated, { has_map_upload: Boolean(data.imageUrl) });
      setSceneEntrySource("create");
      setIsDialogOpen(false);
      reset();
      setUploadedFile(null);
      navigate(`/scene?id=${encodeURIComponent(newId)}`);
    } catch (error) {
      posthog.capture(ANALYTICS_EVENTS.CreateSceneMutationFailed, {
        error_category: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      });
      setError("root", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleRemoveImage = async () => {
    await deleteCurrentUpload();
    setValue("imageUrl", "", { shouldValidate: true });
  };

  const handleCancel = () => {
    void deleteCurrentUpload();
    reset();
    setIsDialogOpen(false);
  };

  return {
    // Dialog state
    isDialogOpen,
    setIsDialogOpen,
    handleDialogOpenChange,

    // Form
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setError,
    imageUrl,

    // Upload
    isUploading,
    handleFileInputChange,

    // Handlers
    onSubmit,
    handleRemoveImage,
    handleCancel,
  } as const;
}
