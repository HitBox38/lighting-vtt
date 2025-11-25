import { Button } from "@/components/ui/button";

interface MirrorToolbarProps {
  onAddMirror: () => void;
}

export function MirrorToolbar({ onAddMirror }: MirrorToolbarProps) {
  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur">
      <Button size="sm" variant="outline" onClick={onAddMirror}>
        Add Mirror
      </Button>
    </div>
  );
}

export default MirrorToolbar;
