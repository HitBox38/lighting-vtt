import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UploadButton } from "@/utils/uploadthing";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { GetMapsResponse, SaveMapPayload, SaveMapResponse } from "@shared/index";
import { Loader2, Plus, ImageIcon } from "lucide-react";

interface NewSceneFormData {
  name: string;
  imageUrl: string;
}

export const LibraryPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; key: string } | null>(null);

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
    defaultValues: {
      name: "",
      imageUrl: "",
    },
  });

  const imageUrl = useWatch({
    control,
    name: "imageUrl",
  });

  const getMaps = async (creatorId: string) => {
    const response = await fetch(`/api/maps?creatorId=${creatorId}`);
    const data = (await response.json()) as GetMapsResponse;
    return data;
  };

  const { data } = useQuery<GetMapsResponse>({
    queryKey: ["maps", user?.id ?? ""],
    queryFn: () => getMaps(user?.id ?? ""),
    enabled: !!user?.id,
  });

  const saveSceneMutation = useMutation<SaveMapResponse, Error, SaveMapPayload>({
    mutationFn: async (payload) => {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save scene");
      }

      return (await response.json()) as SaveMapResponse;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["maps", variables.creatorId] });
      setIsDialogOpen(false);
      reset();
      setUploadedFile(null);
      if (data.payload?.id) {
        navigate(`/scene?id=${encodeURIComponent(data.payload.id)}`);
      }
    },
    onError: (error) => {
      setError("root", {
        message: error.message || "An error occurred",
      });
    },
  });

  const deleteCurrentUpload = async () => {
    if (!uploadedFile?.key) {
      setUploadedFile(null);
      return;
    }
    const keyToDelete = uploadedFile.key;
    setUploadedFile(null);
    try {
      await fetch("/api/uploadthing/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: keyToDelete }),
      });
    } catch (error) {
      console.error("Failed to delete upload", error);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      void deleteCurrentUpload();
      reset();
    }
  };

  const onSubmit = async (data: NewSceneFormData) => {
    if (!user?.id) {
      setError("root", { message: "You must be signed in to create a scene" });
      return;
    }

    const payload: SaveMapPayload = {
      creatorId: user.id,
      name: data.name.trim(),
      mapUrl: data.imageUrl,
      lightsState: {},
      mirrorsState: {},
    };

    try {
      await saveSceneMutation.mutateAsync(payload);
    } catch {
      // Error handling is managed in onError
    }
  };

  const handleImageUploadComplete = (file: { url: string; key: string }) => {
    setValue("imageUrl", file.url, { shouldValidate: true });
    setUploadedFile(file);
    clearErrors("imageUrl");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold tracking-tight">Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SignedIn>
              <div className="flex items-center gap-2">
                <UserButton />
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl={"/library"}>
                <Button variant="default" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl={"/library"}>
                <Button variant="default" size="sm">
                  Sign up
                </Button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">
        <SignedIn>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            }>
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Your Maps</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {/* New Scene Card */}
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/50 transition-colors h-full">
                      <CardHeader>
                        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          New Scene
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm">
                          Create a new scene with a map image
                        </p>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Scene</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                      {/* Name Input */}
                      <div className="grid gap-2">
                        <label htmlFor="scene-name" className="text-sm font-medium">
                          Scene Name
                        </label>
                        <Input
                          id="scene-name"
                          placeholder="Enter scene name..."
                          autoFocus
                          disabled={isSubmitting}
                          aria-invalid={!!errors.name}
                          {...register("name", {
                            required: "Scene name is required",
                            validate: (value) =>
                              value.trim().length > 0 || "Scene name cannot be empty",
                          })}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>

                      {/* Image Upload */}
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Map Image</label>
                        <input
                          type="hidden"
                          {...register("imageUrl", {
                            required: "Please upload an image",
                          })}
                        />
                        {imageUrl ? (
                          <div className="relative rounded-md border overflow-hidden">
                            <img
                              src={imageUrl}
                              alt="Uploaded map"
                              className="w-full h-32 object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={handleRemoveImage}
                              disabled={isSubmitting}>
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-md border border-dashed">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            <UploadButton
                              endpoint="imageUploader"
                              onClientUploadComplete={(res) => {
                                const file = res?.[0];
                                if (file?.ufsUrl && file?.key) {
                                  handleImageUploadComplete({ url: file.ufsUrl, key: file.key });
                                }
                              }}
                              onUploadError={(error: Error) => {
                                setError("imageUrl", {
                                  message: `Upload failed: ${error.message}`,
                                });
                              }}
                            />
                          </div>
                        )}
                        {errors.imageUrl && (
                          <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
                        )}
                      </div>

                      {/* Root Error Message */}
                      {errors.root && (
                        <p className="text-sm text-destructive">{errors.root.message}</p>
                      )}

                      {/* Submit Button */}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSubmitting}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
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
                {data?.payload?.map((map) => (
                  <Card
                    key={map.id}
                    onClick={() => navigate(`/scene?id=${encodeURIComponent(map.id)}`)}
                    className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 p-0 gap-0">
                    {/* Image Container with Aspect Ratio */}
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <img
                        src={map.mapUrl}
                        alt={map.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Gradient Overlay on Hover */}
                      <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Title Bar */}
                    <div className="p-3 bg-card">
                      <h3
                        className="text-xl font-semibold tracking-tight truncate"
                        title={map.name}>
                        {map.name}
                      </h3>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Suspense>
        </SignedIn>
        <SignedOut>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to see your maps</h2>
            <SignInButton mode="modal" forceRedirectUrl={"/library"}>
              <Button variant="default" size="sm">
                Sign in
              </Button>
            </SignInButton>
          </div>
        </SignedOut>
      </main>
    </div>
  );
};
