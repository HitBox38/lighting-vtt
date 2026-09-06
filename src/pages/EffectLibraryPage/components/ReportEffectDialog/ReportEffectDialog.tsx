import { useState } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { describeMutationError } from "@/lib/effects/errors";

interface Props {
  effectId: Id<"effects">;
  effectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mirrors `MAX_REPORT_REASON_LENGTH` in convex/effects.ts; the server is the authority. */
const MAX_REASON_LENGTH = 500;

export function ReportEffectDialog({
  effectId,
  effectName,
  open,
  onOpenChange,
}: Props) {
  const posthog = usePostHog();
  const reportEffect = useMutation(api.effects.reportEffect);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = reason.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= MAX_REASON_LENGTH && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await reportEffect({ effectId, reason: trimmed });
      posthog.capture(ANALYTICS_EVENTS.EffectReported, { effect_id: effectId });
      toast.success("Report sent. Thanks for keeping the library safe.");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(describeMutationError(error, "Could not send the report"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report “{effectName}”</DialogTitle>
          <DialogDescription>
            Tell a moderator what is wrong: it crashes the table, it is
            offensive, it copies someone else's work. One open report per
            effect.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={MAX_REASON_LENGTH}
          rows={4}
          autoFocus
          aria-label="Report reason"
          placeholder="What happened?"
          className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-1"
        />
        <div className="text-muted-foreground text-right text-[11px]">
          {trimmed.length} / {MAX_REASON_LENGTH}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : null}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
