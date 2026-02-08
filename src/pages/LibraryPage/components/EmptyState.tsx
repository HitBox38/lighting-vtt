import { Button } from "@/components/ui/button";
import { ImageIcon, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateScene: () => void;
}

/** Shown when the user has zero scenes. */
export const EmptyState = ({ onCreateScene }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-28 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
      <ImageIcon className="w-7 h-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium mb-1.5">No scenes yet</h3>
    <p className="text-sm text-muted-foreground mb-5 max-w-sm leading-relaxed">
      Create your first scene to start building dynamic lighting for your tabletop sessions.
    </p>
    <Button size="sm" className="gap-1.5" onClick={onCreateScene}>
      <Plus className="w-4 h-4" />
      Create your first scene
    </Button>
  </div>
);
