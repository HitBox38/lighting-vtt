import { Button } from "@/components/ui/button";
import { HudSurface } from "@/components/hud/HudSurface";

interface MirrorToolbarProps {
  onAddMirror: () => void;
}

export function MirrorToolbar({ onAddMirror }: MirrorToolbarProps) {
  return (
    <HudSurface className="items-center">
      <Button size="sm" variant="outline" onClick={onAddMirror}>
        Add Mirror
      </Button>
    </HudSurface>
  );
}

export default MirrorToolbar;
