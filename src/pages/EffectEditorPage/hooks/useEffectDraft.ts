import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { STARTER_SCRIPT } from "@/lib/effects/scriptContract";
import { z } from "zod";
import {
  compileTypeScript,
  typedScriptStarter,
} from "../components/CodeEditor/typescriptCompiler";
import { STARTER_GLSL, STARTER_WGSL } from "@/lib/effects/shaderContract";
import {
  effectDefinitionSchema,
  type EffectBlend,
  type EffectCoverage,
  type EffectDefinition,
  type EffectParam,
} from "@shared/effects";

/**
 * What the editor form holds. Identical to `EffectDefinition` except the
 * optional sources (`glsl`, `script`) are always strings so an empty tab never
 * juggles `undefined`; `toDefinition` normalises them back before validation
 * and save. Every source survives a kind switch, so flipping shader to script
 * and back loses nothing.
 */
export interface EffectDraft {
  category?: EffectDefinition["category"];
  source?: EffectDefinition["source"];
  thumbnailUrl?: string;
  thumbnailKey?: string;
  name: string;
  description: string;
  kind: EffectDefinition["kind"];
  wgsl: string;
  glsl: string;
  script: string;
  scriptLanguage: "js" | "ts";
  typescript: string;
  typescriptInitialized: boolean;
  params: EffectParam[];
  coverage: EffectCoverage;
  blend: EffectBlend;
}

export function newEffectDraft(
  kind: EffectDefinition["kind"] = "shader",
  scriptLanguage: "js" | "ts" = "js",
): EffectDraft {
  const base = {
    name: "Untitled effect",
    description: "",
    wgsl: STARTER_WGSL,
    glsl: STARTER_GLSL,
    script: STARTER_SCRIPT,
    scriptLanguage,
    typescriptInitialized: scriptLanguage === "ts",
    typescript:
      scriptLanguage === "ts" ? typedScriptStarter(STARTER_SCRIPT) : "",
  };
  switch (kind) {
    case "shader":
      return {
        ...base,
        kind,
        params: [
          { key: "color", label: "Colour", type: "color", default: "#ffb347" },
          {
            key: "speed",
            label: "Speed",
            type: "number",
            min: 0,
            max: 10,
            step: 0.1,
            default: 2,
          },
        ],
        coverage: { kind: "circle" },
        blend: "add",
      };
    case "script":
      return {
        ...base,
        kind,
        params: [
          {
            key: "width",
            label: "Beam width",
            type: "number",
            min: 2,
            max: 200,
            step: 1,
            default: 24,
          },
        ],
        // The script's own geometry is the point; a coverage circle would swamp it.
        coverage: { kind: "none" },
        blend: "normal",
      };
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
    }
  }
}

export function draftFromDefinition(definition: EffectDefinition): EffectDraft {
  return {
    category: definition.category,
    source: definition.source,
    thumbnailUrl: definition.thumbnailUrl,
    thumbnailKey: definition.thumbnailKey,
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    wgsl: definition.wgsl,
    glsl: definition.glsl ?? "",
    script: definition.script ?? "",
    scriptLanguage: definition.typescript !== undefined ? "ts" : "js",
    typescript: definition.typescript ?? "",
    typescriptInitialized: definition.typescript !== undefined,
    params: definition.params.map((param) => ({ ...param })),
    coverage: { ...definition.coverage },
    blend: definition.blend,
  };
}

/**
 * The shape the server accepts. Only the sources the kind uses are kept, so a
 * shader effect never ships a stale script (or vice versa); an empty optional
 * tab means "no such program".
 */
export function toDefinition(draft: EffectDraft): EffectDefinition {
  const glsl = draft.glsl.trim().length > 0 ? draft.glsl : undefined;
  const script = draft.script.trim().length > 0 ? draft.script : undefined;
  let sources: Pick<
    EffectDefinition,
    "wgsl" | "glsl" | "script" | "typescript"
  >;
  switch (draft.kind) {
    case "shader":
      sources = { wgsl: draft.wgsl, glsl, script: undefined };
      break;
    case "script":
      sources =
        draft.scriptLanguage === "ts"
          ? {
              wgsl: "",
              glsl: undefined,
              script: compileTypeScript(draft.typescript).code,
              typescript: draft.typescript,
            }
          : { wgsl: "", glsl: undefined, script };
      break;
    default: {
      const exhaustive: never = draft.kind;
      throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
    }
  }
  return {
    category: draft.category,
    source: draft.source,
    thumbnailUrl: draft.thumbnailUrl,
    thumbnailKey: draft.thumbnailKey,
    name: draft.name,
    description: draft.description,
    kind: draft.kind,
    ...sources,
    params: draft.params,
    coverage: draft.coverage,
    blend: draft.blend,
  };
}

/** Zod issues keyed by dotted path, e.g. `"name"` or `"params.2.key"`. */
export type DraftIssues = ReadonlyMap<string, string>;

export interface EffectDraftState {
  draft: EffectDraft;
  /** The definition as it will be saved. Fails validation when `issues` is non-empty. */
  definition: EffectDefinition;
  issues: DraftIssues;
  /** True when the draft differs from what was last loaded or saved. */
  dirty: boolean;
  recoveryStatus: "pending" | "saved" | "unavailable";
  patch: (partial: Partial<EffectDraft>) => void;
  setParams: (params: EffectParam[]) => void;
  /** Replace the draft and the dirty baseline, e.g. after loading a version or saving. */
  reset: (draft: EffectDraft) => void;
}

function serialize(draft: EffectDraft): string {
  // Recovery parses fields in schema order; compare values independently of key order.
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(draft).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

// Recovery validates structure, not save-time constraints: an unfinished name,
// invalid parameter range, or empty source is still work worth recovering.
const recoveryBase = { key: z.string(), label: z.string() };
export const recoveryDraftSchema = z.object({
  name: z.string(),
  description: z.string(),
  kind: z.enum(["shader", "script"]),
  wgsl: z.string(),
  glsl: z.string(),
  script: z.string(),
  scriptLanguage: z.enum(["js", "ts"]).default("js"),
  typescript: z.string().default(""),
  typescriptInitialized: z.boolean().default(false),
  params: z.array(
    z.discriminatedUnion("type", [
      z.object({
        ...recoveryBase,
        type: z.literal("number"),
        min: z.number(),
        max: z.number(),
        step: z.number(),
        default: z.number(),
      }),
      z.object({
        ...recoveryBase,
        type: z.literal("color"),
        default: z.string(),
      }),
      z.object({
        ...recoveryBase,
        type: z.literal("boolean"),
        default: z.boolean(),
      }),
    ]),
  ),
  coverage: z.object({ kind: z.enum(["circle", "none"]) }),
  blend: z.enum(["normal", "add"]),
  category: effectDefinitionSchema.shape.category,
  source: effectDefinitionSchema.shape.source,
  thumbnailUrl: z.string().optional(),
  thumbnailKey: z.string().optional(),
});

export function readRecoveredDraft(key: string): EffectDraft | undefined {
  try {
    const result = recoveryDraftSchema.safeParse(
      JSON.parse(localStorage.getItem(key) ?? "null"),
    );
    return result.success
      ? {
          ...result.data,
          typescriptInitialized:
            result.data.typescriptInitialized ||
            result.data.scriptLanguage === "ts" ||
            result.data.typescript.length > 0,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

export function useEffectDraft(
  initial: EffectDraft,
  recoveryKey?: string,
): EffectDraftState {
  const recoveryCleared = useRef(false);
  const [recoveryStatus, setRecoveryStatus] = useState<
    "pending" | "saved" | "unavailable"
  >("pending");
  const [draft, setDraft] = useState<EffectDraft>(() => {
    return (recoveryKey && readRecoveredDraft(recoveryKey)) || initial;
  });
  useEffect(() => {
    if (!recoveryKey) return;
    const persist = () => {
      if (recoveryCleared.current) return;
      try {
        localStorage.setItem(recoveryKey, JSON.stringify(draft));
        localStorage.setItem(
          `${recoveryKey}:${draft.kind}`,
          JSON.stringify(draft),
        );
        setRecoveryStatus("saved");
      } catch {
        setRecoveryStatus("unavailable");
      }
    };
    const timer = window.setTimeout(persist, 300);
    return () => {
      window.clearTimeout(timer);
      persist();
    };
  }, [draft, recoveryKey]);
  const [baseline, setBaseline] = useState<string>(() => serialize(initial));

  const patch = useCallback((partial: Partial<EffectDraft>) => {
    setRecoveryStatus("pending");
    recoveryCleared.current = false;
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  const setParams = useCallback((params: EffectParam[]) => {
    setRecoveryStatus("pending");
    recoveryCleared.current = false;
    setDraft((current) => ({ ...current, params }));
  }, []);

  const reset = useCallback(
    (next: EffectDraft) => {
      recoveryCleared.current = true;
      if (recoveryKey) {
        try {
          localStorage.removeItem(recoveryKey);
          localStorage.removeItem(`${recoveryKey}:${next.kind}`);
        } catch {
          /* Optional storage. */
        }
      }
      setDraft(next);
      setBaseline(serialize(next));
    },
    [recoveryKey],
  );

  const definition = useMemo(() => toDefinition(draft), [draft]);

  const issues = useMemo<DraftIssues>(() => {
    const result = effectDefinitionSchema.safeParse(definition);
    const map = new Map<string, string>();
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        // Keep the first message per field; later ones are usually consequences of it.
        if (!map.has(path)) map.set(path, issue.message);
      }
    }
    return map;
  }, [definition]);

  const dirty = useMemo(() => serialize(draft) !== baseline, [draft, baseline]);

  return {
    draft,
    definition,
    issues,
    dirty,
    recoveryStatus,
    patch,
    setParams,
    reset,
  };
}
