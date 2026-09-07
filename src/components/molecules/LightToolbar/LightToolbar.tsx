import { Button } from "@/components/ui/button";
import { HudSurface } from "@/components/atoms/HudSurface";

type LightToolbarProps = {
  onAddRadial: () => void;
  onAddConic: () => void;
  onAddLine: () => void;
};

export function LightToolbar({ onAddRadial, onAddConic, onAddLine }: LightToolbarProps) {
  return (
    <HudSurface className="items-center">
      <Button size="sm" onClick={onAddRadial}>
        Add Radial Light
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddConic}>
        Add Conic Light
      </Button>
      <Button size="sm" variant="outline" onClick={onAddLine}>
        Add Line Light
      </Button>
    </HudSurface>
  );
}
