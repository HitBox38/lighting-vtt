import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Users, MoreHorizontal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlayerViewToolbar } from "@/components/molecules/PlayerViewToolbar";
import { UserToolbar } from "@/components/molecules/UserToolbar";
import { PlayersSheet } from "@/components/organisms/PlayersSheet";
import { PresetToolbar } from "@/components/organisms/PresetToolbar";
import { TokenToolbar } from "@/components/organisms/TokenToolbar";
import { SaveStatusIndicator } from "@/components/atoms/SaveStatusIndicator";
import { useWorkshopStore } from "@/stores/workshopStore";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function GameCanvasHud({ sceneId }: { sceneId?: string | null }) {
  const open = useWorkshopStore((s) => s.open);
  const setOpen = useWorkshopStore((s) => s.setOpen);
  const status = useLightStore((s) => s.saveStatus);
  const [tokensOpen, setTokensOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 px-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="workshop-panel pointer-events-auto flex min-w-0 w-fit items-center gap-1 p-1.5">
          <Button asChild size="icon" variant="ghost">
            <Link to="/library" aria-label="Back to scenes">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <PresetToolbar />
          <div className="hidden xl:block">
            <SaveStatusIndicator status={status} />
          </div>
          {status !== "idle" ? (
            <span
              role="status"
              className={`mr-1 size-2 shrink-0 rounded-full xl:hidden ${status === "error" ? "bg-red-400" : status === "saved" ? "bg-emerald-400" : "bg-amber-400"}`}
              title={
                status === "error"
                  ? "Save failed"
                  : status === "saved"
                    ? "Saved"
                    : "Saving…"
              }
            >
              <span className="sr-only">
                {status === "error"
                  ? "Save failed"
                  : status === "saved"
                    ? "Saved"
                    : "Saving…"}
              </span>
            </span>
          ) : null}
        </div>
        <div className="workshop-panel pointer-events-auto flex items-center gap-1 p-1.5">
          <Button
            id="workshop-trigger"
            size="sm"
            variant={open ? "secondary" : "ghost"}
            aria-expanded={open}
            onClick={() => {
              setTokensOpen(false);
              useTokenStore.getState().setPlacementTemplateId(null);
              setOpen(!open);
            }}
          >
            <Sparkles className="size-4 text-amber-500" />
            <span>Effects</span>
          </Button>
          <Popover
            open={tokensOpen}
            onOpenChange={(value) => {
              setTokensOpen(value);
              if (value) {
                setOpen(false);
                useWorkshopStore.getState().cancel();
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="Tokens">
                <Users className="size-4" />
                <span className="hidden sm:inline">Tokens</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <h2 className="mb-3 font-semibold">Tokens</h2>
              <TokenToolbar />
            </PopoverContent>
          </Popover>
        </div>
        <div className="pointer-events-auto flex justify-end">
          <div className="hidden 2xl:flex items-center gap-2">
            <PlayerViewToolbar />
            {sceneId ? <PlayersSheet sceneId={sceneId} /> : null}
            <UserToolbar />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="workshop-panel 2xl:hidden"
                size="icon"
                variant="outline"
                aria-label="Session controls"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              <p className="workshop-eyebrow">Session controls</p>
              <PlayerViewToolbar />
              {sceneId ? <PlayersSheet sceneId={sceneId} /> : null}
              <UserToolbar />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
