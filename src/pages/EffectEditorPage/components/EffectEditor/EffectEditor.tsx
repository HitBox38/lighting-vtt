import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { usePostHog } from "@posthog/react";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  LogIn,
  Save,
  PanelsTopLeft,
  MoreHorizontal,
  Sparkles,
  Eye,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { EffectParamFields } from "@/components/molecules/EffectParamFields";
import { type ScriptPreviewResult } from "@/components/organisms/EffectPreview";
import { PreviewStage } from "@/components/organisms/EffectPreview/PreviewStage";
import type { PreviewHandle } from "@/components/organisms/EffectPreview/EffectPreview";
import { useUploadThing } from "@/utils/uploadthing";
import { PlaceEffectButton } from "@/components/molecules/PlaceEffectButton/PlaceEffectButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TemplatePicker } from "./TemplatePicker";
import { PreviewStatus } from "./PreviewStatus";
import { useWorkbenchLayout } from "../../hooks/useWorkbenchLayout";
import type { Entry } from "../CodeEditor/authoringReference";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EFFECT_CATEGORIES } from "@shared/effects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useWorkbenchMedia } from "../../hooks/useWorkbenchMedia";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { describeMutationError } from "@/lib/effects/errors";
import type {
  CompiledEffect,
  EffectDiagnostic,
} from "@/lib/effects/effectRegistry";
import {
  effectEditorPath,
  EFFECT_LIBRARY_PATH,
  sanitizeReturnTo,
} from "@/lib/effects/routes";
import { lintScriptSource } from "@/lib/effects/scriptContract";
import {
  compileTypeScript,
  typedScriptStarter,
} from "../CodeEditor/typescriptCompiler";
import {
  lintAuthorSource,
  type EffectBackend,
  type EffectSourceLanguage,
  type ShaderLanguage,
} from "@/lib/effects/shaderContract";
import { cn } from "@/lib/utils";
import {
  coerceParamValues,
  defaultParamValues,
  EFFECT_LIMITS,
  type EffectBlend,
  type EffectCoverage,
  type EffectDefinition,
  type EffectKind,
  type EffectParamValues,
} from "@shared/effects";

import {
  CodeEditor,
  type CodeEditorHandle,
} from "@/pages/EffectEditorPage/components/CodeEditor";
import { ContractReference } from "@/pages/EffectEditorPage/components/ContractReference";
import {
  DiagnosticsPanel,
  type CompileStatus,
} from "@/pages/EffectEditorPage/components/DiagnosticsPanel";
import { ParamsEditor } from "@/pages/EffectEditorPage/components/ParamsEditor";
import {
  useEffectDraft,
  newEffectDraft,
  readRecoveredDraft,
  type EffectDraft,
} from "@/pages/EffectEditorPage/hooks/useEffectDraft";

/** Where a save goes. */
export type EditorTarget =
  | { kind: "new" }
  | {
      kind: "existing";
      effectId: Id<"effects">;
      version: number;
      latestVersion: number;
      visibility: Doc<"effects">["visibility"];
      /** Owners append versions; everyone else saves a private copy. */
      isOwner: boolean;
    };

interface Props {
  initialDraft: EffectDraft;
  target: EditorTarget;
  /** Scene path to return to, or null when the editor was opened directly. */
  returnTo: string | null;
  /** Convex-authenticated (not just Clerk). Saving is disabled until this is true. */
  signedIn: boolean;
}

const PREVIEW_DEBOUNCE_MS = 350;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Identity of the compiled programs; anything else in the definition does not trigger a recompile. */
function sourceKeyOf(definition: EffectDefinition): string {
  return `${definition.kind}\u0000${definition.wgsl}\u0000${definition.glsl ?? ""}\u0000${definition.script ?? ""}`;
}

/** The code tab an effect of this kind opens on. */
function defaultTabFor(kind: EffectKind): EffectSourceLanguage {
  switch (kind) {
    case "shader":
      return "wgsl";
    case "script":
      return "js";
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
    }
  }
}

function lintDiagnostics(
  language: ShaderLanguage,
  source: string,
): EffectDiagnostic[] {
  return lintAuthorSource(language, source).map((token) => ({
    severity: "error",
    message: `\`${token.token}\`: ${token.reason}`,
    line: token.line,
    language,
  }));
}

function backendLabel(backend: EffectBackend): string {
  switch (backend) {
    case "webgpu":
      return "WebGPU";
    case "webgl":
      return "WebGL";
    default: {
      const exhaustive: never = backend;
      throw new Error(`Unhandled backend: ${String(exhaustive)}`);
    }
  }
}

interface CompileRecord {
  sourceKey: string;
  result: CompiledEffect;
  backend: EffectBackend;
}

interface ScriptRunRecord {
  sourceKey: string;
  result: ScriptPreviewResult;
}

export function EffectEditor({
  initialDraft,
  target,
  returnTo,
  signedIn,
}: Props) {
  const navigate = useNavigate();
  const { isSignedIn: clerkSignedIn } = useUser();
  const [searchParams] = useSearchParams();
  const browseFrom = sanitizeReturnTo(searchParams.get("browseFrom"));
  const posthog = usePostHog();
  const createEffect = useMutation(api.effects.createEffect);
  const saveVersion = useMutation(api.effects.saveVersion);

  const recoveryKey = `workshop:draft:v1:${target.kind === "new" ? "new" : `${target.effectId}@${target.version}`}`;
  const {
    draft,
    definition,
    issues,
    dirty,
    recoveryStatus,
    patch,
    setParams,
    reset,
  } = useEffectDraft(initialDraft, recoveryKey);
  const captureRef = useRef<PreviewHandle | null>(null);
  const { startUpload } = useUploadThing("imageUploader");
  const kindDrafts = useRef<Partial<Record<EffectKind, EffectDraft>>>({});
  const [mobilePanel, setMobilePanel] = useState("code");
  const { isDesktop, isReferenceBeside } = useWorkbenchMedia();
  const layout = useWorkbenchLayout();
  const workbenchRef = layout.refs.workbench;
  const desktopLayout = layout.saved;
  const [referenceContext, setReferenceContext] = useState<Entry | null>(null);
  const handleContextChange = useCallback(
    (entry: Entry | null) =>
      setReferenceContext((current) =>
        current?.signature === entry?.signature &&
        current?.description === entry?.description
          ? current
          : entry,
      ),
    [],
  );
  useLayoutEffect(() => {
    workbenchRef.current?.setLayout(
      isDesktop
        ? desktopLayout.current.workbench
        : {
            source: mobilePanel === "code" ? 100 : 0,
            preview: mobilePanel === "preview" ? 100 : 0,
          },
    );
  }, [isDesktop, mobilePanel, workbenchRef, desktopLayout]);
  const [inspectorTab, setInspectorTab] = useState("controls");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [dismissedDiagnostics, setDismissedDiagnostics] = useState<
    string | null
  >(null);
  const [showTemplates, setShowTemplates] = useState(
    target.kind === "new" && !dirty,
  );
  const publishEffect = useMutation(api.effects.publishEffect);

  const [activeTab, setActiveTab] = useState<EffectSourceLanguage>(() =>
    defaultTabFor(draft.kind),
  );
  const [showReference, setShowReference] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [backend, setBackend] = useState<EffectBackend | null>(null);
  const [compile, setCompile] = useState<CompileRecord | null>(null);
  const [scriptRun, setScriptRun] = useState<ScriptRunRecord | null>(null);
  const [previewValues, setPreviewValues] = useState<EffectParamValues>(() =>
    defaultParamValues(draft.params),
  );

  const wgslEditorRef = useRef<CodeEditorHandle>(null);
  const glslEditorRef = useRef<CodeEditorHandle>(null);
  const jsEditorRef = useRef<CodeEditorHandle>(null);
  const editorRefFor = (language: EffectSourceLanguage) => {
    switch (language) {
      case "wgsl":
        return wgslEditorRef;
      case "glsl":
        return glslEditorRef;
      case "js":
      case "ts":
        return jsEditorRef;
      default: {
        const exhaustive: never = language;
        throw new Error(`Unhandled source language: ${String(exhaustive)}`);
      }
    }
  };

  const isScript = draft.kind === "script";
  const scriptLanguage = draft.scriptLanguage;
  const typeScriptDiagnostics = useMemo(
    () =>
      isScript && scriptLanguage === "ts"
        ? compileTypeScript(draft.typescript).diagnostics
        : [],
    [isScript, scriptLanguage, draft.typescript],
  );
  const handleScriptLanguageChange = (language: "js" | "ts") => {
    patch({
      scriptLanguage: language,
      ...(language === "ts" && !draft.typescriptInitialized
        ? {
            typescript: typedScriptStarter(draft.script),
            typescriptInitialized: true,
          }
        : {}),
    });
    setActiveTab(language);
  };
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (
        window.confirm(
          "Leave this editor? Your draft is kept locally for recovery.",
        )
      )
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

  // ---------------------------------------------------------------------------
  // Analytics + unsaved-changes guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.EffectEditorOpened, {
      mode: target.kind === "new" ? "new" : target.isOwner ? "edit" : "fork",
      effect_id: target.kind === "existing" ? target.effectId : undefined,
      version: target.kind === "existing" ? target.version : undefined,
    });
    if (target.kind === "existing" && !target.isOwner)
      posthog.capture("effect_remix_started", {
        effect_id: target.effectId,
        version: target.version,
      });
    // Fire once per mount; the target is fixed for the component's lifetime (the page keys on it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---------------------------------------------------------------------------
  // Preview + diagnostics
  // ---------------------------------------------------------------------------
  const debouncedDefinition = useDebouncedValue(
    definition,
    PREVIEW_DEBOUNCE_MS,
  );
  const debouncedRef = useRef(debouncedDefinition);
  debouncedRef.current = debouncedDefinition;

  const handleCompiled = useCallback(
    (result: CompiledEffect, compiledOn: EffectBackend) => {
      // The preview drops stale results itself, so what it reports is always for the current debounced source.
      setCompile({
        sourceKey: sourceKeyOf(debouncedRef.current),
        result,
        backend: compiledOn,
      });
    },
    [],
  );

  const handleScript = useCallback((result: ScriptPreviewResult) => {
    setScriptRun({ sourceKey: sourceKeyOf(debouncedRef.current), result });
  }, []);

  const debouncedKind = debouncedDefinition.kind;

  const lint = useMemo(() => {
    switch (debouncedKind) {
      case "shader":
        return {
          wgsl: lintDiagnostics("wgsl", debouncedDefinition.wgsl),
          glsl: debouncedDefinition.glsl
            ? lintDiagnostics("glsl", debouncedDefinition.glsl)
            : [],
          js: [] as EffectDiagnostic[],
        };
      case "script":
        return {
          wgsl: [],
          glsl: [],
          js: lintScriptSource(debouncedDefinition.script ?? ""),
        };
      default: {
        const exhaustive: never = debouncedKind;
        throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
      }
    }
  }, [
    debouncedKind,
    debouncedDefinition.wgsl,
    debouncedDefinition.glsl,
    debouncedDefinition.script,
  ]);

  const debouncedSourceKey = sourceKeyOf(debouncedDefinition);
  const compileCurrent =
    compile !== null && compile.sourceKey === debouncedSourceKey;
  const scriptCurrent =
    scriptRun !== null && scriptRun.sourceKey === debouncedSourceKey;

  const compileStatus = useMemo<CompileStatus>(() => {
    if (backend === null) return { kind: "idle" };
    switch (debouncedKind) {
      case "shader": {
        if (!compileCurrent || compile === null) return { kind: "compiling" };
        switch (compile.result.status) {
          case "ok":
            return { kind: "ok", backend: compile.backend };
          case "missing-program":
            return { kind: "missing-program", backend: compile.backend };
          case "error":
            return { kind: "error", backend: compile.backend };
          default: {
            const exhaustive: never = compile.result;
            throw new Error(`Unhandled compile result: ${String(exhaustive)}`);
          }
        }
      }
      case "script": {
        if (!scriptCurrent || scriptRun === null) return { kind: "running" };
        switch (scriptRun.result.status) {
          case "ok":
            return { kind: "script-ok", elapsedMs: scriptRun.result.elapsedMs };
          case "error":
            return { kind: "script-error" };
          default: {
            const exhaustive: never = scriptRun.result;
            throw new Error(`Unhandled script result: ${String(exhaustive)}`);
          }
        }
      }
      default: {
        const exhaustive: never = debouncedKind;
        throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
      }
    }
  }, [
    backend,
    debouncedKind,
    compile,
    compileCurrent,
    scriptRun,
    scriptCurrent,
  ]);

  const compileDiagnostics = useMemo<EffectDiagnostic[]>(() => {
    switch (debouncedKind) {
      case "shader": {
        if (!compileCurrent || compile === null) return [];
        switch (compile.result.status) {
          case "ok":
            return compile.result.warnings;
          case "error":
            return compile.result.diagnostics;
          case "missing-program":
            return [
              {
                severity: "warning",
                language: compile.result.language,
                line: null,
                message: `No ${compile.result.language.toUpperCase()} program: on ${backendLabel(compile.result.backend)} this effect renders as a plain circle.`,
              },
            ];
          default: {
            const exhaustive: never = compile.result;
            throw new Error(`Unhandled compile result: ${String(exhaustive)}`);
          }
        }
      }
      case "script": {
        if (!scriptCurrent || scriptRun === null) return [];
        switch (scriptRun.result.status) {
          case "ok":
            return scriptRun.result.warnings;
          case "error":
            return scriptRun.result.diagnostics;
          default: {
            const exhaustive: never = scriptRun.result;
            throw new Error(`Unhandled script result: ${String(exhaustive)}`);
          }
        }
      }
      default: {
        const exhaustive: never = debouncedKind;
        throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
      }
    }
  }, [debouncedKind, compile, compileCurrent, scriptRun, scriptCurrent]);

  const glslMissingWarning = useMemo<EffectDiagnostic[]>(() => {
    if (debouncedKind !== "shader" || debouncedDefinition.glsl) return [];
    return [
      {
        severity: "info",
        language: "glsl",
        line: null,
        message:
          "No GLSL program. Players on WebGL will see a plain coverage circle instead of this effect.",
      },
    ];
  }, [debouncedKind, debouncedDefinition.glsl]);

  const allDiagnostics = useMemo(
    () =>
      (typeScriptDiagnostics.length
        ? typeScriptDiagnostics
        : [
            ...lint.wgsl,
            ...lint.glsl,
            ...lint.js,
            ...compileDiagnostics,
            ...glslMissingWarning,
          ]
      ).map(
        (diagnostic): EffectDiagnostic =>
          diagnostic.language === "js" && isScript && scriptLanguage === "ts"
            ? { ...diagnostic, language: "ts" }
            : diagnostic,
      ),
    [
      lint,
      compileDiagnostics,
      glslMissingWarning,
      typeScriptDiagnostics,
      isScript,
      scriptLanguage,
    ],
  );

  const diagnosticsFor = useCallback(
    (language: EffectSourceLanguage) =>
      allDiagnostics.filter((diagnostic) => diagnostic.language === language),
    [allDiagnostics],
  );
  const wgslDiagnostics = useMemo(
    () => diagnosticsFor("wgsl"),
    [diagnosticsFor],
  );
  const glslDiagnostics = useMemo(
    () => diagnosticsFor("glsl"),
    [diagnosticsFor],
  );
  const jsDiagnostics = useMemo(
    () => diagnosticsFor(scriptLanguage),
    [diagnosticsFor, scriptLanguage],
  );

  const revealDiagnostic = useCallback((diagnostic: EffectDiagnostic) => {
    if (diagnostic.line === null) return;
    setActiveTab(diagnostic.language);
    const ref = editorRefFor(diagnostic.language);
    // The target editor may have been hidden this frame; let it lay out before scrolling.
    requestAnimationFrame(() => ref.current?.revealLine(diagnostic.line ?? 1));
  }, []);

  const handleKindChange = (kind: EffectKind) => {
    if (kind === draft.kind) return;
    kindDrafts.current[draft.kind] = draft;
    patch(
      kindDrafts.current[kind] ??
        readRecoveredDraft(`${recoveryKey}:${kind}`) ??
        newEffectDraft(kind),
    );
    setActiveTab(defaultTabFor(kind));
  };

  // ---------------------------------------------------------------------------
  // Preview params follow the declared params
  // ---------------------------------------------------------------------------
  const coercedPreviewValues = useMemo(
    () => coerceParamValues(draft.params, previewValues),
    [draft.params, previewValues],
  );

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const pendingPreview = sourceKeyOf(definition) !== debouncedSourceKey;
  const hasLintErrors =
    lint.wgsl.length > 0 || lint.glsl.length > 0 || lint.js.length > 0;
  const compileFailed =
    typeScriptDiagnostics.length > 0 ||
    compileStatus.kind === "error" ||
    compileStatus.kind === "script-error";
  const diagnosticKey = JSON.stringify(allDiagnostics);
  const diagnosticsOpen =
    showDiagnostics ||
    (compileFailed && dismissedDiagnostics !== diagnosticKey);
  const compileInFlight =
    compileStatus.kind === "compiling" ||
    compileStatus.kind === "running" ||
    compileStatus.kind === "idle";

  let saveBlocker: string | null = null;
  if (!signedIn)
    saveBlocker = clerkSignedIn
      ? "Your account is signed in, but the save service is not connected yet. Your local draft is still available."
      : "Sign in to save effects.";
  else if (issues.size > 0)
    saveBlocker = issues.values().next().value ?? "Fix the highlighted fields.";
  else if (hasLintErrors)
    saveBlocker = "Fix the problems listed under the code first.";
  else if (pendingPreview || compileInFlight)
    saveBlocker = isScript
      ? "Waiting for the preview to run."
      : "Waiting for the preview to compile.";
  else if (compileFailed)
    saveBlocker = isScript
      ? "The script fails in the preview."
      : "The shader does not compile on this machine.";
  else if (target.kind === "existing" && target.isOwner && !dirty)
    saveBlocker = "No changes since the last version.";

  const canSave = saveBlocker === null && !saving;

  const saveLabel = (() => {
    if (target.kind === "new") return "Save effect";
    if (!target.isOwner) return "Save as my copy";
    return `Save as v${target.latestVersion + 1}`;
  })();

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!canSave) {
      if (saveBlocker) toast.error(saveBlocker);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    posthog.capture("effect_save_started", { kind: draft.kind });
    try {
      let savedDefinition = { ...definition };
      try {
        const blob = await captureRef.current?.capture();
        if (blob) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          const uploaded = await Promise.race([
            startUpload([
              new File([blob], "effect-preview.png", { type: "image/png" }),
            ]),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Thumbnail upload timed out")),
                12_000,
              );
            }),
          ]).finally(() => clearTimeout(timeout));
          const file = uploaded?.[0];
          if (file)
            savedDefinition = {
              ...savedDefinition,
              thumbnailUrl: file.ufsUrl,
              thumbnailKey: file.key,
            };
        }
      } catch {
        toast("Effect will be saved without a new thumbnail.");
      }
      if (target.kind === "existing" && target.isOwner) {
        const { version } = await saveVersion({
          effectId: target.effectId,
          definition: savedDefinition,
        });
        reset(draft);
        toast.success(`Saved ${definition.name} as v${version}`);
        posthog.capture(ANALYTICS_EVENTS.EffectVersionSaved, {
          effect_id: target.effectId,
          version,
          mode: "edit",
        });
        navigate(
          effectEditorPath(
            target.effectId,
            version,
            returnTo ?? undefined,
            browseFrom ?? undefined,
          ),
          { replace: true },
        );
      } else {
        if (target.kind === "existing") {
          savedDefinition.source = {
            effectId: target.effectId,
            version: target.version,
          };
        }
        const { effectId, version } = await createEffect({
          definition: savedDefinition,
        });
        reset(draft);
        toast.success(
          target.kind === "new"
            ? `Created ${definition.name}`
            : `Saved a private copy of ${definition.name}`,
        );
        posthog.capture(ANALYTICS_EVENTS.EffectVersionSaved, {
          effect_id: effectId,
          version,
          mode: target.kind === "new" ? "new" : "fork",
        });
        navigate(
          effectEditorPath(
            effectId,
            version,
            returnTo ?? undefined,
            browseFrom ?? undefined,
          ),
          {
            replace: true,
          },
        );
      }
    } catch (error) {
      posthog.capture("effect_save_failed", { kind: draft.kind });
      toast.error(describeMutationError(error, "Could not save the effect"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleBack = () =>
    navigate(browseFrom ?? returnTo ?? EFFECT_LIBRARY_PATH);
  const saveFromKeyboard = useEffectEvent(() => {
    void handleSave();
  });
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveFromKeyboard();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const nameIssue = issues.get("name");
  const descriptionIssue = issues.get("description");
  const sourceIssue = isScript
    ? issues.get(scriptLanguage === "ts" ? "typescript" : "script")
    : issues.get("wgsl");

  const sceneActions =
    target.kind === "existing" ? (
      <div className="flex gap-2">
        <PlaceEffectButton
          item={{
            kind: "effect",
            effectId: target.effectId,
            version: target.version,
            name: draft.name,
            params: coercedPreviewValues,
          }}
          returnTo={returnTo}
          disabled={dirty}
        />
        {target.isOwner && target.visibility === "private" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={dirty || saving}
            onClick={() => {
              if (
                window.confirm(
                  "Publish this saved version to the public library? Its source and controls will be available for others to use and remix. Preview compatibility is only verified for this browser.",
                )
              )
                void publishEffect({ effectId: target.effectId })
                  .then(() => {
                    toast.success("Published to the effect library.");
                    posthog.capture("effect_published", {
                      effect_id: target.effectId,
                    });
                  })
                  .catch(() => toast.error("Could not publish. Try again."));
            }}
          >
            Publish
          </Button>
        ) : null}
      </div>
    ) : null;
  return (
    <div className="workshop-studio bg-background text-foreground flex h-dvh flex-col">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          aria-label="Back"
          className="px-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            maxLength={EFFECT_LIMITS.maxNameLength}
            aria-label="Effect name"
            aria-invalid={Boolean(nameIssue)}
            className="h-9 min-w-20 max-w-xs font-medium"
            placeholder="Effect name"
          />
          {target.kind === "existing" ? (
            <Badge
              variant="secondary"
              className="hidden font-mono sm:inline-flex"
            >
              v{target.version}
              {target.version !== target.latestVersion
                ? ` of ${target.latestVersion}`
                : ""}
            </Badge>
          ) : (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              New
            </Badge>
          )}
          {target.kind === "existing" ? (
            <Badge
              variant={target.visibility === "public" ? "default" : "outline"}
              className="hidden capitalize lg:inline-flex"
            >
              {target.visibility}
            </Badge>
          ) : null}
          {target.kind === "existing" && !target.isOwner ? (
            <Badge
              variant="outline"
              className="hidden xl:inline-flex"
              title="Saving creates a private copy. The original stays unchanged."
            >
              Remix
            </Badge>
          ) : null}
          <span
            className="hidden min-w-32 text-[11px] leading-tight text-muted-foreground sm:block"
            title={
              recoveryStatus === "saved"
                ? "Recovered on this device. Save a version to use this effect in scenes."
                : recoveryStatus === "unavailable"
                  ? "Browser storage is unavailable. Keep this page open until you save a version."
                  : "Updating the recovery copy on this device."
            }
          >
            {dirty
              ? "Unsaved version"
              : target.kind === "new"
                ? "New draft"
                : "Version saved"}
            <span
              className={cn(
                "mt-0.5 block",
                recoveryStatus === "unavailable" &&
                  "text-amber-600 dark:text-amber-400",
              )}
            >
              {recoveryStatus === "saved"
                ? "Draft backed up locally"
                : recoveryStatus === "unavailable"
                  ? "Local recovery unavailable"
                  : "Backing up draft…"}
            </span>
          </span>
        </div>

        {sceneActions &&
          (isDesktop ? (
            sceneActions
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Scene actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto">
                <p className="mb-2 text-xs text-muted-foreground">
                  Saved version actions
                </p>
                {sceneActions}
              </PopoverContent>
            </Popover>
          ))}
        {!signedIn && !clerkSignedIn ? (
          <SignInButton mode="modal">
            <Button size="sm" className="workshop-primary">
              <LogIn className="size-3.5" />
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Sign in to save</span>
            </Button>
          </SignInButton>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Disabled buttons swallow pointer events; the span keeps the tooltip reachable. */}
                <span tabIndex={canSave ? -1 : 0}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    className="workshop-primary"
                    disabled={!canSave}
                    aria-label={
                      !signedIn && clerkSignedIn
                        ? "Save unavailable"
                        : saveLabel
                    }
                  >
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    <span className="sm:hidden">Save</span>
                    <span className="hidden sm:inline">
                      {!signedIn && clerkSignedIn
                        ? "Save unavailable"
                        : saveLabel}
                    </span>
                  </Button>
                </span>
              </TooltipTrigger>
              {saveBlocker ? (
                <TooltipContent>{saveBlocker}</TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="order-last flex w-full items-center justify-between gap-2 text-[10px] text-muted-foreground sm:hidden">
          <span>
            {target.kind === "existing"
              ? `v${target.version} · ${target.visibility}${!target.isOwner ? " · Remix" : ""}`
              : "New effect"}
            {dirty ? " · Unsaved" : ""}
          </span>
          <span
            className={recoveryStatus === "unavailable" ? "text-amber-500" : ""}
          >
            {recoveryStatus === "saved"
              ? "Draft backed up locally"
              : recoveryStatus === "unavailable"
                ? "Local recovery unavailable"
                : "Backing up draft…"}
          </span>
        </div>
      </header>

      <TemplatePicker
        open={showTemplates}
        onOpenChange={setShowTemplates}
        dirty={dirty}
        onChoose={(next, name) => {
          patch(next);
          setPreviewValues(defaultParamValues(next.params));
          setReferenceContext(null);
          setActiveTab(next.kind === "script" ? next.scriptLanguage : "wgsl");
          setShowTemplates(false);
          posthog.capture("effect_template_selected", {
            template: name,
            language: next.kind === "script" ? next.scriptLanguage : "wgsl",
          });
        }}
      />
      <div className="flex shrink-0 items-center justify-between border-b px-2 py-1.5 lg:hidden">
        <div className="flex gap-1">
          {["code", "preview"].map((panel) => (
            <Button
              key={panel}
              size="sm"
              variant={mobilePanel === panel ? "secondary" : "ghost"}
              aria-pressed={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
            >
              {panel === "code" ? "Code" : "Preview & controls"}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowTemplates(true)}
        >
          <Sparkles className="size-4" />
          Starters
        </Button>
      </div>
      <ResizablePanelGroup
        id="effect-workbench"
        orientation="horizontal"
        groupRef={workbenchRef}
        disabled={!isDesktop}
        className="flex-1"
        onLayoutChanged={isDesktop ? layout.remember("workbench") : undefined}
      >
        {/* Code column */}
        <ResizablePanel
          id="source"
          defaultSize={`${layout.initial.workbench.source}%`}
          minSize={isDesktop ? "35%" : mobilePanel === "code" ? "100%" : "0%"}
          maxSize={isDesktop ? "70%" : mobilePanel === "code" ? "100%" : "0%"}
          className={cn(
            "flex h-full min-h-0 flex-col",
            !isDesktop && mobilePanel !== "code" && "hidden",
          )}
          inert={!isDesktop && mobilePanel !== "code"}
          aria-label="Effect source"
        >
          <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b bg-muted/10 px-2 py-1">
            {isScript ? (
              <Select
                value={scriptLanguage}
                onValueChange={(value) =>
                  handleScriptLanguageChange(value as "js" | "ts")
                }
              >
                <SelectTrigger
                  aria-label="Script language"
                  className="h-8 w-36 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="js">JavaScript</SelectItem>
                  <SelectItem value="ts">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <>
                <TabButton
                  active={activeTab === "wgsl"}
                  onClick={() => {
                    setActiveTab("wgsl");
                    setReferenceContext(null);
                  }}
                  problems={
                    wgslDiagnostics.filter((d) => d.severity === "error").length
                  }
                >
                  WGSL
                </TabButton>
                <TabButton
                  active={activeTab === "glsl"}
                  onClick={() => {
                    setActiveTab("glsl");
                    setReferenceContext(null);
                  }}
                  problems={
                    glslDiagnostics.filter((d) => d.severity === "error").length
                  }
                >
                  GLSL{" "}
                  <span className="text-muted-foreground ml-1 font-normal">
                    optional
                  </span>
                </TabButton>
              </>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="hidden h-7 text-xs lg:inline-flex"
              onClick={() => setShowTemplates(true)}
            >
              <Sparkles className="size-3.5" />
              Starters
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hidden h-7 text-xs lg:inline-flex"
                >
                  <PanelsTopLeft className="size-3.5" />
                  Layout
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                {(["Balanced", "Code focus", "Preview focus"] as const).map(
                  (preset) => (
                    <DropdownMenuItem
                      key={preset}
                      onSelect={() => layout.applyPreset(preset)}
                    >
                      {preset}
                    </DropdownMenuItem>
                  ),
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={layout.reset}>
                  <RotateCcw className="size-3.5" />
                  Reset layout
                </DropdownMenuItem>
                <p className="max-w-52 px-2 py-1.5 text-[11px] text-muted-foreground">
                  Panel sizes are remembered on this device.
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
            {sourceIssue ? (
              <span className="text-destructive text-xs">{sourceIssue}</span>
            ) : null}
            <Button
              type="button"
              variant={showReference ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowReference((value) => !value)}
              aria-pressed={showReference}
            >
              <BookOpen className="mr-1 h-4 w-4" />
              Reference
            </Button>
          </div>

          <ResizablePanelGroup
            orientation="vertical"
            id="source-diagnostics"
            groupRef={layout.refs.diagnostics}
            onLayoutChanged={layout.remember("diagnostics")}
            className="flex-1"
          >
            <ResizablePanel
              id="editor"
              minSize="35%"
              defaultSize={`${layout.initial.diagnostics.editor}%`}
            >
              <ResizablePanelGroup
                orientation={isReferenceBeside ? "horizontal" : "vertical"}
                id="source-reference"
                groupRef={layout.refs.reference}
                onLayoutChanged={layout.remember("reference")}
              >
                <ResizablePanel
                  id="code"
                  minSize="40%"
                  defaultSize={`${layout.initial.reference.code}%`}
                  className="relative h-full"
                >
                  {isScript ? (
                    <CodeEditor
                      onContextChange={handleContextChange}
                      ref={jsEditorRef}
                      key={scriptLanguage}
                      language={scriptLanguage}
                      params={draft.params}
                      value={
                        scriptLanguage === "ts"
                          ? draft.typescript
                          : draft.script
                      }
                      onChange={(value) =>
                        patch(
                          scriptLanguage === "ts"
                            ? { typescript: value }
                            : { script: value },
                        )
                      }
                      diagnostics={jsDiagnostics}
                      className="h-full"
                    />
                  ) : (
                    <>
                      <CodeEditor
                        onContextChange={handleContextChange}
                        ref={wgslEditorRef}
                        language="wgsl"
                        params={draft.params}
                        value={draft.wgsl}
                        onChange={(value) => patch({ wgsl: value })}
                        diagnostics={wgslDiagnostics}
                        className={cn(
                          "h-full",
                          activeTab !== "wgsl" && "hidden",
                        )}
                      />
                      <CodeEditor
                        onContextChange={handleContextChange}
                        ref={glslEditorRef}
                        language="glsl"
                        params={draft.params}
                        value={draft.glsl}
                        onChange={(value) => patch({ glsl: value })}
                        diagnostics={glslDiagnostics}
                        className={cn(
                          "h-full",
                          activeTab !== "glsl" && "hidden",
                        )}
                      />
                    </>
                  )}
                </ResizablePanel>
                {showReference ? (
                  <>
                    <ResizableHandle
                      withHandle
                      aria-label="Resize code and reference"
                    />
                    <ResizablePanel
                      id="reference"
                      minSize="25%"
                      maxSize="60%"
                      defaultSize={`${layout.initial.reference.reference}%`}
                      className="h-full overflow-y-auto p-3"
                      aria-label="Effect API reference"
                    >
                      <ContractReference
                        context={referenceContext}
                        onInsert={(source) =>
                          editorRefFor(
                            isScript ? scriptLanguage : activeTab,
                          ).current?.insertText(source)
                        }
                        language={isScript ? scriptLanguage : activeTab}
                        params={draft.params}
                      />
                    </ResizablePanel>
                  </>
                ) : null}
              </ResizablePanelGroup>
            </ResizablePanel>
            {diagnosticsOpen ? (
              <>
                <ResizableHandle
                  withHandle
                  aria-label="Resize code and diagnostics"
                />
                <ResizablePanel
                  id="diagnostics"
                  defaultSize={`${layout.initial.diagnostics.diagnostics}%`}
                  minSize="15%"
                  maxSize="65%"
                  aria-label="Diagnostics"
                >
                  <DiagnosticsPanel
                    status={
                      typeScriptDiagnostics.length
                        ? { kind: "script-error" }
                        : compileStatus
                    }
                    diagnostics={allDiagnostics}
                    onSelect={revealDiagnostic}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>

          <div className="shrink-0 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDiagnostics(!diagnosticsOpen);
                setDismissedDiagnostics(diagnosticsOpen ? diagnosticKey : null);
              }}
              aria-expanded={diagnosticsOpen}
            >
              {allDiagnostics.length
                ? `${allDiagnostics.length} diagnostics`
                : "No problems"}{" "}
              · {diagnosticsOpen ? "Collapse" : "Expand"}
            </Button>
          </div>
        </ResizablePanel>

        {isDesktop ? (
          <ResizableHandle withHandle aria-label="Resize code and preview" />
        ) : null}

        {/* Inspector column */}
        <ResizablePanel
          id="preview"
          defaultSize={`${layout.initial.workbench.preview}%`}
          minSize={
            isDesktop ? "30%" : mobilePanel === "preview" ? "100%" : "0%"
          }
          maxSize={
            isDesktop ? "65%" : mobilePanel === "preview" ? "100%" : "0%"
          }
          className={cn(
            "h-full",
            !isDesktop && mobilePanel !== "preview" && "hidden",
          )}
          inert={!isDesktop && mobilePanel !== "preview"}
          aria-label="Effect preview and controls"
        >
          <ResizablePanelGroup
            orientation="vertical"
            id="preview-inspector"
            groupRef={layout.refs.inspector}
            onLayoutChanged={layout.remember("inspector")}
          >
            <ResizablePanel
              id="stage"
              defaultSize={`${layout.initial.inspector.stage}%`}
              minSize="30%"
              className="flex h-full flex-col overflow-y-auto p-3"
            >
              <PreviewStage
                fill
                status={
                  <PreviewStatus
                    status={compileStatus}
                    failed={compileFailed}
                    backend={backend}
                    script={isScript}
                    onDiagnostics={() => {
                      setShowDiagnostics(true);
                      if (!isDesktop) setMobilePanel("code");
                    }}
                  />
                }
                captureRef={captureRef}
                definition={debouncedDefinition}
                params={coercedPreviewValues}
                onCompiled={handleCompiled}
                onScript={handleScript}
                onBackend={setBackend}
                className="aspect-square w-full overflow-hidden rounded-md border"
              />
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label="Resize preview and controls"
            />
            <ResizablePanel
              id="inspector"
              defaultSize={`${layout.initial.inspector.inspector}%`}
              minSize="25%"
              className="h-full overflow-y-auto"
              aria-label="Effect controls and details"
            >
              <div
                className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background/95 p-2 backdrop-blur-sm"
                aria-label="Inspector mode"
              >
                {[
                  {
                    id: "controls",
                    label: "Controls",
                    icon: SlidersHorizontal,
                  },
                  { id: "player", label: "Player controls", icon: Eye },
                  { id: "details", label: "Details" },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={inspectorTab === tab.id ? "secondary" : "ghost"}
                    aria-pressed={inspectorTab === tab.id}
                    className="h-8 gap-1.5 px-2 text-xs"
                    onClick={() => setInspectorTab(tab.id)}
                  >
                    {tab.icon && <tab.icon className="size-3.5" />}
                    {tab.label}
                  </Button>
                ))}
              </div>
              {inspectorTab === "player" && (
                <div className="space-y-4 p-4">
                  <div>
                    <p className="workshop-eyebrow">In the scene</p>
                    <h3 className="mt-1 text-lg font-medium">
                      {draft.name || "Untitled effect"}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Your authored controls, as they appear in the scene
                      inspector. Try the saved defaults before sharing.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card/30 p-4">
                    <EffectParamFields
                      params={draft.params}
                      values={coercedPreviewValues}
                      onChange={setPreviewValues}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreviewValues(defaultParamValues(draft.params))
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    Try saved defaults
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Preview values only. This does not change defaults or scene
                    permissions.
                  </p>
                </div>
              )}
              <div
                className={cn(
                  "space-y-3 border-b p-3",
                  inspectorTab !== "details" && "hidden",
                )}
              >
                <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Details
                </h3>
                <div className="space-y-1">
                  <Label
                    htmlFor="effect-description"
                    className={cn(
                      "text-xs",
                      descriptionIssue && "text-destructive",
                    )}
                  >
                    Description
                  </Label>
                  <textarea
                    id="effect-description"
                    value={draft.description}
                    onChange={(event) =>
                      patch({ description: event.target.value })
                    }
                    maxLength={EFFECT_LIMITS.maxDescriptionLength}
                    rows={3}
                    placeholder="What does this effect do, and which params matter?"
                    className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-xs shadow-xs outline-none focus-visible:ring-1"
                  />
                  {descriptionIssue ? (
                    <p className="text-destructive text-[11px]">
                      {descriptionIssue}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="effect-category" className="text-xs">
                    Category
                  </Label>
                  <Select
                    value={draft.category ?? "Other"}
                    onValueChange={(value) =>
                      patch({
                        category: value as EffectDefinition["category"],
                      })
                    }
                  >
                    <SelectTrigger
                      id="effect-category"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EFFECT_CATEGORIES.map((category) => (
                        <SelectItem
                          key={category}
                          value={category}
                          className="text-xs"
                        >
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kind</Label>
                  <Select
                    disabled={target.kind === "existing" && target.isOwner}
                    value={draft.kind}
                    onValueChange={(value) =>
                      handleKindChange(value as EffectKind)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shader" className="text-xs">
                        Shader: paints colour and animation on the map
                      </SelectItem>
                      <SelectItem value="script" className="text-xs">
                        Script: computes lit geometry from lights and mirrors
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Darkness coverage</Label>
                    <Select
                      value={draft.coverage.kind}
                      onValueChange={(value) =>
                        patch({
                          coverage: { kind: value as EffectCoverage["kind"] },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle" className="text-xs">
                          Circle (cuts darkness)
                        </SelectItem>
                        <SelectItem value="none" className="text-xs">
                          None (paint only)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Blend</Label>
                    <Select
                      value={draft.blend}
                      onValueChange={(value) =>
                        patch({ blend: value as EffectBlend })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal" className="text-xs">
                          Normal
                        </SelectItem>
                        <SelectItem value="add" className="text-xs">
                          Additive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div
                className={cn("p-3", inspectorTab !== "controls" && "hidden")}
              >
                <ParamsEditor
                  values={coercedPreviewValues}
                  onValuesChange={setPreviewValues}
                  params={draft.params}
                  onChange={setParams}
                  issues={issues}
                  kind={draft.kind}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function TabButton({
  active,
  problems,
  onClick,
  children,
}: {
  active: boolean;
  problems: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {problems > 0 ? (
        <span className="bg-destructive text-destructive-foreground ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
          {problems}
        </span>
      ) : null}
    </button>
  );
}
