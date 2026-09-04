import { Plus } from "lucide-react";

import { CreateTokenFormFields } from "@/components/organisms/TokenToolbar/components/CreateTokenFormFields";
import type { useCreateTokenForm } from "@/components/organisms/TokenToolbar/hooks/useCreateTokenForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateTokenDialogProps {
  form: ReturnType<typeof useCreateTokenForm>;
}

export function CreateTokenDialog({ form }: CreateTokenDialogProps) {
  const canSubmit = form.imageUrl.length > 0 && form.imageKey.length > 0 && !form.isUploading;

  return (
    <Dialog
      open={form.isDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.resetForm();
        }
        form.setIsDialogOpen(open);
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
          onSubmit={(event) => void form.form.handleSubmit(form.onSubmit)(event)}
          className="grid gap-4 py-2">
          <CreateTokenFormFields form={form} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void form.cleanupDraftUpload();
                form.setIsDialogOpen(false);
                form.resetForm();
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
  );
}
