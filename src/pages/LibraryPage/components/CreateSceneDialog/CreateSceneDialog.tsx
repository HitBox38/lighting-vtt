import { useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateSceneActions } from "@/pages/LibraryPage/components/CreateSceneDialog/components/CreateSceneActions";
import { MapImageField } from "@/pages/LibraryPage/components/CreateSceneDialog/components/MapImageField";
import { SceneNameField } from "@/pages/LibraryPage/components/CreateSceneDialog/components/SceneNameField";
import type { useCreateSceneForm } from "@/pages/LibraryPage/hooks/useCreateSceneForm";

type FormHandle = ReturnType<typeof useCreateSceneForm>;

interface CreateSceneDialogProps {
  form: FormHandle;
}

export function CreateSceneDialog({ form }: CreateSceneDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={form.isDialogOpen} onOpenChange={form.handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Scene
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Scene</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(form.onSubmit)} className="grid gap-4 py-4">
          <SceneNameField form={form} />
          <MapImageField form={form} fileInputRef={fileInputRef} />
          {form.errors.root ? (
            <p className="text-sm text-destructive">{form.errors.root.message}</p>
          ) : null}
          <CreateSceneActions
            isSubmitting={form.isSubmitting}
            isUploading={form.isUploading}
            onCancel={form.handleCancel}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
