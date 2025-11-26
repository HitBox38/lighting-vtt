import { Monitor } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PlayerViewToolbar() {
  const location = useLocation();

  const handleOpenPlayerView = () => {
    const url = new URL(`${window.location.origin}/scene`);
    const params = new URLSearchParams(location.search);
    params.set("isGM", "false");
    url.search = params.toString();
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="outline" onClick={handleOpenPlayerView}>
            <Monitor className="size-4 mr-2" />
            Player View
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Open player view in new window</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default PlayerViewToolbar;
