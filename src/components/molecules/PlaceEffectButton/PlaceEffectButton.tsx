import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { placementPath, type CatalogItem } from "@/lib/effects/catalog";
import { usePostHog } from "@posthog/react";

export function PlaceEffectButton({
  item,
  returnTo,
  disabled = false,
}: {
  item: CatalogItem;
  returnTo: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const scenes = useQuery(
    api.scenes.getByCreatorId,
    open && user ? { creatorId: user.id } : "skip",
  );
  const place = (path: string) => {
    posthog.capture("effect_placement_started", {
      kind: item.kind,
      source: "gallery",
    });
    navigate(placementPath(path, item));
  };
  return (
    <>
      <Button
        className="workshop-primary"
        disabled={disabled}
        onClick={() => {
          if (returnTo?.startsWith("/scene?")) place(returnTo);
          else setOpen(true);
        }}
      >
        Place effect
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Choose a scene</DialogTitle>
          <DialogDescription>
            Choose where to place this effect. You will position it on the map
            next.
          </DialogDescription>
          {!user ? (
            <SignInButton mode="modal">
              <Button>Sign in to choose your scene</Button>
            </SignInButton>
          ) : scenes === undefined ? (
            <p role="status">Loading scenes…</p>
          ) : scenes.length === 0 ? (
            <Button asChild>
              <Link to="/library">Create your first scene</Link>
            </Button>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {scenes.map((scene) => (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  key={scene._id}
                  onClick={() => place(`/scene?id=${scene._id}`)}
                >
                  {scene.name}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
