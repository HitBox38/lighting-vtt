import { describe, expect, test } from "bun:test";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { editorLanguage } from "../src/pages/EffectEditorPage/components/EffectEditor/editorLanguage";
import {
  draftFromDefinition,
  newEffectDraft,
  recoveryDraftSchema,
  toDefinition,
} from "../src/pages/EffectEditorPage/hooks/useEffectDraft";

describe("the editor language follows the source being edited", () => {
  test.each(["js", "ts"] as const)(
    "restoring a %s draft replaces a stale shader language",
    (language) => {
      const restored = recoveryDraftSchema.parse(
        JSON.parse(JSON.stringify(newEffectDraft("script", language))),
      );
      expect(editorLanguage(restored, "wgsl")).toBe(language);
      expect(editorLanguage(restored, "glsl")).toBe(language);
    },
  );

  test.each(["js", "ts"] as const)(
    "opening a saved %s version uses its persisted source language",
    (language) => {
      const saved = toDefinition(newEffectDraft("script", language));
      const loaded = draftFromDefinition(saved);
      expect(editorLanguage(loaded, "wgsl")).toBe(language);
    },
  );

  test("changing script language updates the editor even with a prior script tab", () => {
    expect(editorLanguage(newEffectDraft("script", "ts"), "js")).toBe("ts");
    expect(editorLanguage(newEffectDraft("script", "js"), "ts")).toBe("js");
  });

  test("script starters replace the shader language and shader drafts keep valid tabs", () => {
    for (const starter of EFFECT_STARTERS.filter((s) => s.kind === "script")) {
      expect(editorLanguage(draftFromDefinition(starter), "wgsl")).toBe(
        starter.typescript === undefined ? "js" : "ts",
      );
    }
    const shader = newEffectDraft("shader");
    expect(editorLanguage(shader, "wgsl")).toBe("wgsl");
    expect(editorLanguage(shader, "glsl")).toBe("glsl");
    expect(editorLanguage(shader, "js")).toBe("wgsl");
    expect(editorLanguage(shader, "ts")).toBe("wgsl");
  });
});
