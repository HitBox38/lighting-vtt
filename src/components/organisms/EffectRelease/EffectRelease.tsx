import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { ANALYTICS_EVENTS, errorCategory } from "@/lib/analytics";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "@posthog/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { EffectDefinition } from "@shared/effects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RendererChecks, type RendererCheckResults } from "../EffectPreview/RendererChecks";
import { describeMutationError, mutationRetryAt } from "@/lib/effects/errors";

interface ReleaseProps {
  effectId: Id<"effects">;
  version: number;
  definition: EffectDefinition;
  defaultOpen?: boolean;
}

export function EffectRelease(props: ReleaseProps) {
  const status = useQuery(api.effects.releaseStatus, { effectId: props.effectId, version: props.version });
  const release = useMutation(api.effects.publishEffect);
  const posthog = usePostHog();
  return <EffectReleaseReview {...props} status={status} release={release} capture={(event, fields) => posthog.capture(event, fields)} />;
}

/** Presentation accepts the transport so the full review can be tested locally. */
export function EffectReleaseReview({ effectId, version, definition, defaultOpen = false, status, release, capture }: ReleaseProps & {
  status: FunctionReturnType<typeof api.effects.releaseStatus> | undefined;
  release: (args: { effectId: Id<"effects">; version: number }) => Promise<null>;
  capture: (event: string, fields: Record<string, string | number>) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [results, setResults] = useState<RendererCheckResults | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const deadline = Math.max(retryAt ?? 0, status?.retryAt ?? 0);
  useEffect(() => {
    if (!deadline) return;
    // Subscribe to the display clock immediately, including a cooldown arriving
    // from another tab after this review has been mounted for a while.
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [deadline]);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const cooldown = seconds ? `Available in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : null;
  const failed = results && Object.values(results).includes("failed");
  const incomplete = !results || Object.values(results).includes("checking");
  const warning = results && Object.values(results).some(s => s === "unavailable" || s === "fallback");
  const noWorkingRenderer = results && !Object.values(results).includes("passed");
  const alreadyPublic = status?.publishedVersion === version;
  const submit = async () => {
    if (submitting.current || !status || status.reason || cooldown || failed || incomplete || noWorkingRenderer || (warning && !acknowledged)) return;
    submitting.current = true; setBusy(true); setMessage(null);
    const measurableRelease = analyticsOperationGuard();
    const context = { attempt_id: crypto.randomUUID(), effect_id: effectId, effect_kind: definition.kind, version };
    if (measurableRelease()) capture(ANALYTICS_EVENTS.EffectPublishStarted, context);
    try {
      await release({ effectId, version });
      setMessage(`Released v${version} to the public library.`);
      if (measurableRelease()) capture(ANALYTICS_EVENTS.EffectPublished, context);
    } catch (error) {
      const retry = mutationRetryAt(error);
      setNow(Date.now()); setRetryAt(retry); setMessage(describeMutationError(error, "Could not release. Your saved version is safe; retry here."));
      if (measurableRelease()) {
        capture(ANALYTICS_EVENTS.EffectPublishFailed, { ...context, error_category: errorCategory(error) });
        capture("effect_release_failed", { ...context, reason: retry ? "cooldown" : "mutation" });
      }
    } finally { submitting.current = false; setBusy(false); }
  };
  return <div className="space-y-1">
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{alreadyPublic ? `Public v${version}` : "Release version"}</Button>
    <p className="text-xs text-muted-foreground">Version v{version} · {status?.publishedVersion ? `Public v${status.publishedVersion}` : "Private"}{cooldown ? ` · ${cooldown}` : ""}</p>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-xl">
        <DialogHeader><DialogTitle>Release {definition.name} · v{version}</DialogTitle>
          <DialogDescription>This saved version’s source and controls will be available for everyone to use and remix. Existing scenes keep their pinned versions.</DialogDescription></DialogHeader>
        {status?.enabled === false && <p className="text-sm">Version releases are not enabled yet. Publishing shares the effect and future saves update its public listing.</p>}
        <div className="text-sm"><p className="font-medium">Saved defaults</p>
          {definition.params.length ? <ul className="mt-2 space-y-1">{definition.params.map(param => <li key={param.key}>{param.label}: <code>{String(param.default)}</code></li>)}</ul> : <p>No adjustable controls.</p>}</div>
        <Button variant="secondary" onClick={() => { setCheckAttempt(value => value + 1); setResults(null); setAcknowledged(false); }}>Check available renderers</Button>
        {checkAttempt > 0 && <RendererChecks key={checkAttempt} definition={definition} onChange={setResults} />}
        <p className="text-xs text-muted-foreground">Checks use these defaults in this browser only. A missing GLSL program uses the WebGL fallback; it is not a successful shader check.</p>
        {failed && <p role="alert" className="text-sm text-destructive">A renderer check failed. Fix the source and save a new version before releasing.</p>}
        {warning && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />I understand that unavailable renderers are untested and fallback rendering differs from the authored effect.</label>}
        {noWorkingRenderer && !incomplete && <p role="alert" className="text-sm">At least one renderer must successfully preview the effect.</p>}
        <p role="status" className="text-sm">{status?.reason ?? cooldown ?? message ?? (alreadyPublic ? `v${version} is already public.` : status?.curator ? "Curator allowance: 60/hour, burst 20." : "Regular allowance: 10/hour, burst 5.")}</p>
        <Button onClick={() => void submit()} disabled={busy || !status || Boolean(status.reason) || alreadyPublic || Boolean(cooldown) || Boolean(failed) || incomplete || Boolean(noWorkingRenderer) || Boolean(warning && !acknowledged)}>{busy ? "Releasing…" : `Release v${version}`}</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
