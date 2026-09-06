import { describe, expect, test } from "bun:test";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { rust } from "@codemirror/lang-rust";
import type { EffectParam } from "../shared/effects";
import type { EffectSourceLanguage } from "../src/lib/effects/shaderContract";
import {
  callDocumentation,
  documentationAt,
  effectCompletionSource,
} from "../src/pages/EffectEditorPage/components/CodeEditor/authoringExtensions";
import { sectionsFor } from "../src/pages/EffectEditorPage/components/CodeEditor/authoringReference";

const params: EffectParam[] = [
  { key: "tint", label: "Tint", type: "color", default: "#ffb347" },
  {
    key: "speed",
    label: "Speed",
    type: "number",
    default: 2,
    min: 0,
    max: 10,
    step: 0.1,
  },
  { key: "enabled", label: "Enabled", type: "boolean", default: true },
];

function stateAt(text: string, language: EffectSourceLanguage) {
  const pos = text.indexOf("¦");
  return EditorState.create({
    doc: text.replace("¦", ""),
    selection: { anchor: pos },
    extensions: [
      language === "js" ? javascript() : language === "wgsl" ? rust() : cpp(),
    ],
  });
}

async function complete(
  text: string,
  language: EffectSourceLanguage,
  controls = params,
  explicit = false,
) {
  const state = stateAt(text, language);
  return await effectCompletionSource(
    language,
    controls,
  )(new CompletionContext(state, state.selection.main.head, explicit));
}

describe("Effect editor contract assistance", () => {
  test("completes only members of the current effect API object", async () => {
    expect(
      (await complete("fx.¦", "wgsl"))?.options.map((o) => o.label),
    ).toContain("time");
    expect(
      (await complete("fx.¦", "glsl"))?.options.map((o) => o.label),
    ).not.toContain("compute");
    expect(
      (await complete("input.¦", "js"))?.options.map((o) => o.label),
    ).toEqual(["effect", "params", "lights", "mirrors"]);
    expect(
      (await complete("input.effect.¦", "js"))?.options.map((o) => o.label),
    ).toContain("radius");
    expect(await complete("unrelated.¦", "js", params, true)).toBeNull();
    expect(await complete("12.¦", "wgsl", params, true)).toBeNull();
  });

  test("replaces only the partial member, preserving its receiver", async () => {
    const text = "input . params . sp¦";
    const result = await complete(text, "js");
    expect(result?.from).toBe(text.indexOf("sp"));
    expect(result?.options.map((o) => o.label)).toEqual([
      "tint",
      "speed",
      "enabled",
    ]);
  });

  test("live control schema drives JavaScript properties and shader slots", async () => {
    const changed = params.filter((p) => p.key !== "tint");
    expect(
      (await complete("input.params.¦", "js", changed))?.options.map(
        (o) => o.label,
      ),
    ).toEqual(["speed", "enabled"]);
    expect(
      (await complete("effectParam(¦", "wgsl", changed))?.options[0],
    ).toMatchObject({ label: "0", displayLabel: "0 · Speed" });
    expect(
      (await complete("ti¦", "wgsl"))?.options.find((o) => o.label === "tint")
        ?.apply,
    ).toBe("effectParamVec(0)");
    expect(
      (await complete("en¦", "glsl"))?.options.find(
        (o) => o.label === "enabled",
      )?.apply,
    ).toBe("effectParam(2)");
  });

  test("does not offer API completions in comments or strings", async () => {
    for (const language of ["js", "wgsl", "glsl"] as const) {
      expect(await complete("// fx.¦", language, params, true)).toBeNull();
      expect(
        await complete("/* comment\ninput.¦\n*/", language, params, true),
      ).toBeNull();
    }
    expect(
      await complete('const text = "input.¦";', "js", params, true),
    ).toBeNull();
  });

  test("offers entry-point and expression snippets appropriate to each language", async () => {
    expect(
      (await complete("¦", "js", params, true))?.options.map((o) => o.label),
    ).toContain("compute");
    for (const language of ["wgsl", "glsl"] as const) {
      const options = (await complete("¦", language, params, true))?.options;
      expect(options?.map((o) => o.label)).toContain("softFalloff");
      expect(
        options?.find((o) => o.label === "effectMain")?.apply,
      ).toBeFunction();
      expect(options?.map((o) => o.label)).not.toContain("compute");
    }
  });

  test("hover help and Reference share parameter documentation", () => {
    const state = stateAt("input.params.sp¦eed", "js");
    const hover = documentationAt(
      state,
      state.selection.main.head,
      "js",
      params,
    );
    const reference = sectionsFor("js", params)
      .sections.flatMap((s) => s.entries)
      .find((e) => e.signature === "input.params.speed");
    expect(hover?.entry.description).toBe(reference?.description);
    const shader = stateAt("effectParamVec(¦0)", "wgsl");
    expect(
      documentationAt(shader, shader.selection.main.head, "wgsl", params)?.entry
        .description,
    ).toContain("Tint");
  });

  test("signature hints show the selected slot and disappear after closing the call", () => {
    const state = stateAt("effectParam(2¦", "wgsl");
    expect(callDocumentation(state, "wgsl", params)?.description).toContain(
      "Enabled",
    );
    expect(
      callDocumentation(stateAt("effectParam(2)¦", "wgsl"), "wgsl", params),
    ).toBeNull();
    expect(
      callDocumentation(stateAt("// sampleMap(¦", "wgsl"), "wgsl", params),
    ).toBeNull();
  });
});
