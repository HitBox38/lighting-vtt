import { Monitor } from "lucide-react";
import { useLocation } from "react-router-dom";

import { HudSurface } from "@/components/atoms/HudSurface";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PlayerViewToolbar = () => {
  const location = useLocation();

  const handleOpenPlayerView = () => {
    const url = new URL(`${window.location.origin}/scene`);
    const params = new URLSearchParams(location.search);
    params.set("isGM", "false");
    url.search = params.toString();
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <HudSurface className="items-center">
      <TooltipProvider>
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
      </TooltipProvider>
    </HudSurface>
  );
};
