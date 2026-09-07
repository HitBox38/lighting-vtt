import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AlreadyJoinedPanelProps {
  isJoining: boolean;
  onRejoin: () => void;
}

export function AlreadyJoinedPanel({ isJoining, onRejoin }: AlreadyJoinedPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        You've already joined this scene. Click below to rejoin.
      </p>
      <Button className="w-full" disabled={isJoining} onClick={onRejoin}>
        {isJoining ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <LogIn className="mr-2 size-4" />
        )}
        Rejoin Scene
      </Button>
    </div>
  );
}
