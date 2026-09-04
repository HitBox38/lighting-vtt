import { useCallback, useState } from "react";
import { usePostHog } from "@posthog/react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

interface Props {
  sceneId: string;
  creatorId: string;
}

export function IIInitImportDialog({ sceneId, creatorId }: Props) {
  const posthog = usePostHog();
  const [open, setOpen] = useState(false);
  const [encounterInput, setEncounterInput] = useState("");
  const [liveSync, setLiveSync] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number } | null>(null);

  const importEncounter = useAction(api.iiSync.importEncounter);
  const enableLiveSync = useAction(api.iiSync.enableLiveSync);

  const handleImport = useCallback(async () => {
    if (!encounterInput.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      posthog.capture(ANALYTICS_EVENTS.IIImportStarted);

      const importResult = await importEncounter({
        sceneId: sceneId as Id<"scenes">,
        creatorId,
        encounterId: encounterInput.trim(),
      });

      setResult(importResult);
      posthog.capture(ANALYTICS_EVENTS.IIImportCompleted, {
        imported_count: importResult.imported,
      });

      if (liveSync) {
        await enableLiveSync({
          sceneId: sceneId as Id<"scenes">,
          creatorId,
          encounterId: encounterInput.trim(),
        });
        posthog.capture(ANALYTICS_EVENTS.IILiveSyncEnabled);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    encounterInput,
    sceneId,
    creatorId,
    liveSync,
    importEncounter,
    enableLiveSync,
    posthog,
  ]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setError(null);
        setResult(null);
      }
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Import II</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from Improved Initiative</DialogTitle>
          <DialogDescription>
            Paste a Player View URL or encounter ID from{" "}
            <a
              href="https://improvedinitiative.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline">
              improvedinitiative.app
            </a>{" "}
            to import combatants with their HP, AC, and initiative values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ii-encounter-input">
              Player View URL or Encounter ID
            </Label>
            <Input
              id="ii-encounter-input"
              value={encounterInput}
              onChange={(e) => setEncounterInput(e.target.value)}
              placeholder="https://improvedinitiative.app/p/abc123 or abc123"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ii-live-sync"
              checked={liveSync}
              onChange={(e) => setLiveSync(e.target.checked)}
              disabled={loading}
              className="accent-primary size-4 rounded"
            />
            <Label htmlFor="ii-live-sync" className="cursor-pointer text-sm">
              Keep in sync (live) — polls every 3 seconds
            </Label>
            <RefreshCw className="text-muted-foreground size-3.5" />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              Successfully imported {result.imported} combatant
              {result.imported !== 1 ? "s" : ""}.
              {liveSync && " Live sync is now active."}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={loading || !encounterInput.trim()}
            className="gap-1.5">
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {loading ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IIInitImportDialog;
