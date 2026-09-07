import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { describeMutationError } from "@/lib/effects/errors";

interface Props {
  onSelectEffect: (effectId: string) => void;
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Open reports for moderators. Rendered only when `amAdmin` is true. */
export function ModerationQueue({ onSelectEffect }: Props) {
  const reports = useQuery(api.effects.listOpenReports, {});
  const hideEffect = useMutation(api.effects.hideEffect);
  const dismissReport = useMutation(api.effects.dismissReport);
  const [busyId, setBusyId] = useState<Id<"effectReports"> | null>(null);

  const run = async (
    reportId: Id<"effectReports">,
    action: () => Promise<unknown>,
    fallback: string,
  ) => {
    setBusyId(reportId);
    try {
      await action();
    } catch (error) {
      toast.error(describeMutationError(error, fallback));
    } finally {
      setBusyId(null);
    }
  };

  if (reports === undefined) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (reports.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm">
        No open reports.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {reports.map((report) => {
        const busy = busyId === report._id;
        return (
          <li
            key={report._id}
            className="bg-card space-y-2 rounded-lg border p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="min-w-0 truncate text-left font-medium hover:underline"
                onClick={() => onSelectEffect(report.effectId)}
              >
                {report.effectName ?? "(deleted effect)"}
              </button>
              <span className="text-muted-foreground shrink-0 text-[11px]">
                {formatWhen(report.createdAt)}
              </span>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap text-xs">
              {report.reason}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy || report.effectName === null}
                onClick={() =>
                  run(
                    report._id,
                    async () => {
                      await hideEffect({ effectId: report.effectId });
                      toast.success(
                        "Effect hidden; its open reports were closed.",
                      );
                    },
                    "Could not hide the effect",
                  )
                }
              >
                {busy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <EyeOff className="mr-1 h-3.5 w-3.5" />
                )}
                Hide effect
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(
                    report._id,
                    async () => {
                      await dismissReport({ reportId: report._id });
                    },
                    "Could not dismiss the report",
                  )
                }
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Dismiss
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
