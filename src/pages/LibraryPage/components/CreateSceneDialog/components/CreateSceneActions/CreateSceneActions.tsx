import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CreateSceneActionsProps {
  isSubmitting: boolean;
  isUploading: boolean;
  onCancel: () => void;
}

export function CreateSceneActions({
  isSubmitting,
  isUploading,
  onCancel,
}: CreateSceneActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting || isUploading}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Scene"
        )}
      </Button>
    </div>
  );
}
