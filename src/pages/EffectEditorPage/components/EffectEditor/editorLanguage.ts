import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import type { EffectDraft } from "../../hooks/useEffectDraft";

/** Keep recovered/loaded drafts authoritative over a previous editor tab. */
export function editorLanguage(
  draft: Pick<EffectDraft, "kind" | "scriptLanguage">,
  selectedTab: EffectSourceLanguage,
): EffectSourceLanguage {
  if (draft.kind === "script") return draft.scriptLanguage;
  return selectedTab === "glsl" ? "glsl" : "wgsl";
}
