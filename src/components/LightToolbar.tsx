import { Button } from "@/components/ui/button";

type LightToolbarProps = {
  onAddRadial: () => void;
  onAddConic: () => void;
};

export function LightToolbar({ onAddRadial, onAddConic }: LightToolbarProps) {
  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur">
      <Button size="sm" onClick={onAddRadial}>
        Add Radial Light
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddConic}>
        Add Conic Light
      </Button>
    </div>
  );
}

export default LightToolbar;
