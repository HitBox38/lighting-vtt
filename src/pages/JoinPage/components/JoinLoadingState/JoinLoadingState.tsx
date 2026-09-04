import { Loader2 } from "lucide-react";

export function JoinLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Looking up scene...</p>
      </div>
    </div>
  );
}
