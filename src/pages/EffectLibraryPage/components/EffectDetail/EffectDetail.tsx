import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "@posthog/react";
import {
  Code2,
  EyeOff,
  Flag,
  Globe,
  Loader2,
  Lock,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { EffectParamFields } from "@/components/molecules/EffectParamFields";
import { PreviewStage } from "@/components/organisms/EffectPreview/PreviewStage";
import { PlaceEffectButton } from "@/components/molecules/PlaceEffectButton/PlaceEffectButton";
import type { ScriptPreviewResult } from "@/components/organisms/EffectPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { versionDocToDefinition } from "@/lib/effects/hooks/useEffectDefinitions";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { describeMutationError } from "@/lib/effects/errors";
import type { CompiledEffect } from "@/lib/effects/effectRegistry";
import { effectEditorPath } from "@/lib/effects/routes";
import type { EffectBackend } from "@/lib/effects/shaderContract";
import {
  defaultParamValues,
  type EffectDefinition,
  type EffectParamValues,
} from "@shared/effects";

import { authorLabel, formatDate } from "@/pages/EffectLibraryPage/helpers";
import { ReportEffectDialog } from "@/pages/EffectLibraryPage/components/ReportEffectDialog";

interface Props {
  effectId: string;
  /** Scene path to go back to; enables "Add to scene". */
  returnTo: string | null;
  /** Clerk user id of the viewer, or null when signed out. */
  userId: string | null;
  isAdmin: boolean;
  /** Called after the effect is deleted so the parent can clear the selection. */
  onDeleted: () => void;
}

// ---------------------------------------------------------------------------
// Live preview for one version, with editable params so users can try it out
// ---------------------------------------------------------------------------

interface VersionPreviewProps {
  definition: EffectDefinition;
  effectId: string;
  version: number;
  returnTo: string | null;
}

function VersionPreview({
  definition,
  effectId,
  version,
  returnTo,
}: VersionPreviewProps) {
  const [values, setValues] = useState<EffectParamValues>(() =>
    defaultParamValues(definition.params),
  );
  const [compile, setCompile] = useState<{
    result: CompiledEffect;
    backend: EffectBackend;
  } | null>(null);

  const [scriptResult, setScriptResult] = useState<ScriptPreviewResult | null>(
    null,
  );
  const errors =
    compile && compile.result.status === "error"
      ? compile.result.diagnostics
      : [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <PreviewStage
          definition={definition}
          params={values}
          onCompiled={(result, backend) => setCompile({ result, backend })}
          onScript={setScriptResult}
        />
        {compile ? (
          <Badge variant="outline" className="mt-2 font-mono text-[10px]">
            {compile.backend === "webgpu" ? "WebGPU" : "WebGL"}
          </Badge>
        ) : null}
      </div>
      {scriptResult?.status === "error" ? (
        <p
          role="status"
          className="rounded-lg border border-destructive p-3 text-xs text-destructive"
        >
          Script failed: {scriptResult.diagnostics[0]?.message}. Try another
          effect or remix its source.
        </p>
      ) : null}
      {compile?.result.status === "missing-program" ? (
        <p role="status" className="text-xs text-amber-600">
          This effect has no program for this browser. Placement uses a fallback
          circle.
        </p>
      ) : null}
      {errors.length > 0 ? (
        <div className="bg-destructive/10 text-destructive rounded-md border border-destructive/30 px-3 py-2 text-xs">
          <p className="font-medium">
            This effect does not compile on your GPU backend.
          </p>
          <p className="mt-1 opacity-90">{errors[0]?.message}</p>
          <p className="text-muted-foreground mt-1">
            On the table it will draw as a plain coverage circle instead.
          </p>
        </div>
      ) : null}
      {definition.params.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs">Tune this effect</Label>
          <EffectParamFields
            params={definition.params}
            values={values}
            onChange={setValues}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          This effect has no adjustable params.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <PlaceEffectButton
          item={{
            kind: "effect",
            effectId,
            version,
            name: definition.name,
            params: values,
          }}
          returnTo={returnTo}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setValues(defaultParamValues(definition.params))}
        >
          Reset controls
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Your tuned values will be carried into the scene. Compatibility shown is
        for this browser.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owner / moderator actions
// ---------------------------------------------------------------------------

interface OwnerActionsProps {
  effect: Doc<"effects">;
  onDeleted: () => void;
}

function OwnerActions({ effect, onDeleted }: OwnerActionsProps) {
  const posthog = usePostHog();
  const publishEffect = useMutation(api.effects.publishEffect);
  const unpublishEffect = useMutation(api.effects.unpublishEffect);
  const deleteEffect = useMutation(api.effects.deleteEffect);
  const [busy, setBusy] = useState<"publish" | "unpublish" | "delete" | null>(
    null,
  );

  const run = async (
    kind: NonNullable<typeof busy>,
    action: () => Promise<unknown>,
    fallback: string,
  ) => {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      toast.error(describeMutationError(error, fallback));
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = () =>
    run(
      "publish",
      async () => {
        await publishEffect({ effectId: effect._id });
        posthog.capture(ANALYTICS_EVENTS.EffectPublished, {
          effect_id: effect._id,
        });
        toast.success(`“${effect.name}” is now in the public library.`);
      },
      "Could not publish the effect",
    );

  const handleUnpublish = () =>
    run(
      "unpublish",
      async () => {
        await unpublishEffect({ effectId: effect._id });
        posthog.capture(ANALYTICS_EVENTS.EffectUnpublished, {
          effect_id: effect._id,
        });
        toast.success(
          `“${effect.name}” is private again. Scenes that placed it keep working for you.`,
        );
      },
      "Could not unpublish the effect",
    );

  const handleDelete = () => {
    if (
      !window.confirm(
        `Delete “${effect.name}” and all ${effect.latestVersion} version(s)? Scenes that placed it will show a plain circle.`,
      )
    ) {
      return;
    }
    void run(
      "delete",
      async () => {
        await deleteEffect({ effectId: effect._id });
        toast.success(`Deleted “${effect.name}”.`);
        onDeleted();
      },
      "Could not delete the effect",
    );
  };

  switch (effect.visibility) {
    case "private":
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={busy !== null}
          >
            {busy === "publish" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-1 h-4 w-4" />
            )}
            Publish to library
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={busy !== null}
          >
            {busy === "delete" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      );
    case "public":
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUnpublish}
            disabled={busy !== null}
          >
            {busy === "unpublish" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-1 h-4 w-4" />
            )}
            Unpublish
          </Button>
        </div>
      );
    case "hidden":
      return (
        <div className="space-y-2">
          <p className="text-destructive flex items-center gap-1.5 text-xs">
            <ShieldAlert className="h-3.5 w-3.5" />A moderator hid this effect.
            It cannot be republished; you can still use it in your own scenes.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={busy !== null}
          >
            {busy === "delete" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      );
    default: {
      const exhaustive: never = effect.visibility;
      throw new Error(`Unhandled visibility: ${String(exhaustive)}`);
    }
  }
}

function AdminActions({ effect }: { effect: Doc<"effects"> }) {
  const hideEffect = useMutation(api.effects.hideEffect);
  const [busy, setBusy] = useState(false);

  if (effect.visibility === "hidden") return null;

  const handleHide = async () => {
    if (
      !window.confirm(
        `Hide “${effect.name}” from the library and block republishing?`,
      )
    )
      return;
    setBusy(true);
    try {
      await hideEffect({ effectId: effect._id });
      toast.success(`Hid “${effect.name}”.`);
    } catch (error) {
      toast.error(describeMutationError(error, "Could not hide the effect"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      onClick={handleHide}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <EyeOff className="mr-1 h-4 w-4" />
      )}
      Hide (moderator)
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Detail pane
// ---------------------------------------------------------------------------

export function EffectDetail({
  effectId,
  returnTo,
  userId,
  isAdmin,
  onDeleted,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const effect = useQuery(api.effects.getEffect, { effectId });
  const versions = useQuery(api.effects.listVersions, { effectId });
  const rawVersion = Number(searchParams.get("version"));
  const pickedVersion =
    Number.isInteger(rawVersion) && rawVersion > 0 ? rawVersion : null;
  const setPickedVersion = (version: number) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("version", String(version));
      return next;
    });
  const [reportOpen, setReportOpen] = useState(false);

  const version = pickedVersion ?? effect?.latestVersion ?? null;
  const versionDoc = useQuery(
    api.effects.getVersion,
    version !== null ? { effectId, version } : "skip",
  );

  if (effect === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (effect === null) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
        This effect is not available. It may have been unpublished or deleted.
      </div>
    );
  }

  const mine = userId !== null && effect.authorId === userId;
  const definition = versionDoc ? versionDocToDefinition(versionDoc) : null;
  const canReport = !mine && effect.visibility === "public" && userId !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{effect.name}</h2>
            <Badge variant="secondary" className="font-mono">
              v{version}
            </Badge>
            {mine ? (
              <Badge
                variant={effect.visibility === "public" ? "default" : "outline"}
                className="capitalize"
              >
                {effect.visibility}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            by {authorLabel(effect, mine)} · updated{" "}
            {formatDate(effect.updatedAt)}
          </p>
        </div>

        {effect.description ? (
          <p className="text-sm whitespace-pre-wrap">{effect.description}</p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            No description.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="effect-version" className="text-xs">
              Version
            </Label>
            <Select
              value={version !== null ? String(version) : ""}
              onValueChange={(value) => setPickedVersion(Number(value))}
              disabled={!versions || versions.length === 0}
            >
              <SelectTrigger
                id="effect-version"
                size="sm"
                className="w-44 font-mono"
              >
                <SelectValue placeholder="Loading…" />
              </SelectTrigger>
              <SelectContent>
                {(versions ?? []).map((row) => (
                  <SelectItem
                    key={row.version}
                    value={String(row.version)}
                    className="font-mono"
                  >
                    v{row.version}
                    {row.version === effect.latestVersion
                      ? " (latest)"
                      : ""} · {formatDate(row.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button asChild size="sm" variant="outline">
            <Link
              to={effectEditorPath(
                effect._id,
                version ?? undefined,
                returnTo ?? undefined,
                `/effects?${searchParams.toString()}`,
              )}
            >
              <Code2 className="mr-1 h-4 w-4" />
              {mine ? "Edit in studio" : "Remix effect"}
            </Link>
          </Button>
          {canReport ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="mr-1 h-4 w-4" />
              Report
            </Button>
          ) : null}
        </div>

        {mine ? <OwnerActions effect={effect} onDeleted={onDeleted} /> : null}
        {effect.source ? (
          <p className="text-xs text-muted-foreground">
            Remixed from{" "}
            <Link
              className="underline"
              to={effectEditorPath(
                effect.source.effectId,
                effect.source.version,
                returnTo ?? undefined,
              )}
            >
              source version {effect.source.version}
            </Link>
            .
          </p>
        ) : null}
        {isAdmin && !mine ? <AdminActions effect={effect} /> : null}

        {versionDoc === undefined || version === null ? (
          <div className="bg-muted/30 flex aspect-video items-center justify-center rounded-lg border">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : versionDoc === null || definition === null ? (
          <p className="text-muted-foreground text-sm">
            Version {version} does not exist.
          </p>
        ) : (
          <VersionPreview
            key={`${effect._id}@${version}`}
            definition={definition}
            effectId={effect._id}
            version={version}
            returnTo={returnTo}
          />
        )}
      </div>

      {canReport ? (
        <ReportEffectDialog
          effectId={effect._id}
          effectName={effect.name}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      ) : null}
    </div>
  );
}
