import { ArrowLeft, Maximize, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { HudSurface } from "@/components/atoms/HudSurface";
import { AppSettingsDialog } from "@/components/organisms/AppSettingsDialog";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function PlayerCanvasControls({ fitMap, zoomMap }: {
  fitMap: () => void;
  zoomMap: (direction: 1 | -1) => void;
}) {
  const { isOpen } = useSidebar();
  return (
    <nav aria-label="Player map controls" className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:justify-start">
      <HudSurface className="pointer-events-auto items-center gap-0.5 px-1.5">
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link to="/library" aria-label="Back to scenes"><ArrowLeft className="size-4" /></Link>
        </Button>
        <SidebarTrigger id="player-initiative-trigger" className="size-11" aria-label={isOpen ? "Close initiative" : "Open initiative"} aria-expanded={isOpen} />
        <Button variant="ghost" size="icon" className="size-11" aria-label="Zoom out" onClick={() => zoomMap(-1)}><Minus className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Fit map to screen" onClick={fitMap}><Maximize className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Zoom in" onClick={() => zoomMap(1)}><Plus className="size-4" /></Button>
        <AppSettingsDialog mobileFriendly triggerClassName="size-11" />
      </HudSurface>
    </nav>
  );
}
