import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { SparklesIcon } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import { HudSurface } from "@/components/atoms/HudSurface";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { effectLibraryPath, newEffectPath } from "@/lib/effects/routes";

interface EffectToolbarProps {
  /** Place the latest version of one of the user's own effects at the viewport centre. */
  onPlaceEffect: (effectId: string, version: number) => void;
}

const MAX_LISTED = 12;

export function EffectToolbar({ onPlaceEffect }: EffectToolbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useConvexAuth();
  const mine = useQuery(api.effects.listMine, isAuthenticated ? {} : "skip");
  const returnTo = `${location.pathname}${location.search}`;

  const listed = (mine ?? []).slice(0, MAX_LISTED);

  return (
    <HudSurface className="items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <SparklesIcon className="size-4" />
            Add Effect
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>My effects</DropdownMenuLabel>
          {!isAuthenticated ? (
            <DropdownMenuItem disabled>Sign in to author effects</DropdownMenuItem>
          ) : mine === undefined ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : listed.length === 0 ? (
            <DropdownMenuItem disabled>You have no effects yet</DropdownMenuItem>
          ) : (
            listed.map((effect) => (
              <DropdownMenuItem
                key={effect._id}
                onSelect={() => onPlaceEffect(effect._id, effect.latestVersion)}>
                <span className="truncate">{effect.name}</span>
                <span className="text-muted-foreground ml-auto text-[11px]">v{effect.latestVersion}</span>
              </DropdownMenuItem>
            ))
          )}
          {mine !== undefined && mine.length > MAX_LISTED && (
            <DropdownMenuItem disabled>{mine.length - MAX_LISTED} more in the library</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate(newEffectPath(returnTo))} disabled={!isAuthenticated}>
            New effect…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(effectLibraryPath(returnTo))}>Browse library…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </HudSurface>
  );
}
