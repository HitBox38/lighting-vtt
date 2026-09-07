import { useMemo, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { versionDocToDefinition } from "@/lib/effects/hooks/useEffectDefinitions";
import {
  EFFECT_LIBRARY_PATH,
  RETURN_TO_PARAM,
  sanitizeReturnTo,
} from "@/lib/effects/routes";
import {
  EffectEditor,
  type EditorTarget,
} from "@/pages/EffectEditorPage/components/EffectEditor";
import {
  draftFromDefinition,
  newEffectDraft,
} from "@/pages/EffectEditorPage/hooks/useEffectDraft";

function parseVersion(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex h-screen items-center justify-center p-6">
      {children}
    </div>
  );
}

function Message({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="max-w-md space-y-4 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{body}</p>
      {action ? (
        <div className="flex justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

/**
 * `/effects/new` and `/effects/:effectId?version=N`.
 *
 * Resolves auth and the requested version, then mounts `EffectEditor` keyed on
 * the target so a save that navigates to the new version starts from a clean
 * draft instead of trying to reconcile state in place.
 */
export function EffectEditorPage() {
  const { effectId } = useParams<{ effectId?: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { user } = useUser();

  const returnTo = sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const requestedVersion = parseVersion(searchParams.get("version"));
  const isNew = effectId === undefined;

  const effect = useQuery(
    api.effects.getEffect,
    effectId ? { effectId } : "skip",
  );
  const version = requestedVersion ?? effect?.latestVersion ?? null;
  const versionDoc = useQuery(
    api.effects.getVersion,
    effectId && version !== null ? { effectId, version } : "skip",
  );

  const target = useMemo<EditorTarget | null>(() => {
    if (isNew) return { kind: "new" };
    if (!effect || version === null) return null;
    return {
      kind: "existing",
      effectId: effect._id,
      version,
      latestVersion: effect.latestVersion,
      visibility: effect.visibility,
      isOwner: user?.id === effect.authorId,
    };
  }, [isNew, effect, version, user?.id]);

  const initialDraft = useMemo(() => {
    if (isNew) return newEffectDraft();
    return versionDoc
      ? draftFromDefinition(versionDocToDefinition(versionDoc))
      : null;
  }, [isNew, versionDoc]);

  const backToLibrary = (
    <Button asChild variant="outline" size="sm">
      <Link to={returnTo ?? EFFECT_LIBRARY_PATH}>
        {returnTo ? "Back to scene" : "Back to library"}
      </Link>
    </Button>
  );

  // Wait for auth before judging access: private effects read as "missing" to an anonymous request.
  if (authLoading) {
    return (
      <Centered>
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </Centered>
    );
  }

  if (!isNew) {
    if (effect === undefined || (effect !== null && versionDoc === undefined)) {
      return (
        <Centered>
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </Centered>
      );
    }
    if (effect === null) {
      return (
        <Centered>
          <Message
            title="Effect not found"
            body="It may have been deleted, unpublished by its author, or you may not have access to it."
            action={backToLibrary}
          />
        </Centered>
      );
    }
    if (versionDoc === null) {
      return (
        <Centered>
          <Message
            title={`Version ${version} does not exist`}
            body={`${effect.name} currently has ${effect.latestVersion} version${effect.latestVersion === 1 ? "" : "s"}.`}
            action={
              <>
                <Button asChild size="sm">
                  <Link to={`/effects/${effect._id}`}>Open latest</Link>
                </Button>
                {backToLibrary}
              </>
            }
          />
        </Centered>
      );
    }
  }

  if (!target || !initialDraft) {
    // Unreachable given the branches above; kept so a future refactor fails loudly instead of rendering nothing.
    throw new Error("EffectEditorPage: resolved neither a target nor a draft");
  }

  // Signed-out visitors can draft and preview; saving is gated inside the editor so the modal
  // sign-in never throws away what they typed.
  const key =
    target.kind === "new"
      ? "new"
      : `${target.effectId}@${target.version}@${target.isOwner ? "owner" : "viewer"}`;
  return (
    <EffectEditor
      key={key}
      initialDraft={initialDraft}
      target={target}
      returnTo={returnTo}
      signedIn={isAuthenticated}
    />
  );
}
