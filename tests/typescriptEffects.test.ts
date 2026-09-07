import { expect, test } from "bun:test";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { CompletionContext } from "@codemirror/autocomplete";
import { compileTypeScript } from "../src/pages/EffectEditorPage/components/CodeEditor/typescriptCompiler";
import {
  draftFromDefinition,
  newEffectDraft,
  recoveryDraftSchema,
  toDefinition,
} from "../src/pages/EffectEditorPage/hooks/useEffectDraft";
import { effectDefinitionSchema } from "../shared/effects";
import {
  lintScriptSource,
  sanitizeScriptOutput,
} from "../src/lib/effects/scriptContract";
import { effectCompletionSource } from "../src/pages/EffectEditorPage/components/CodeEditor/authoringExtensions";

test("TypeScript definitions preserve editable source and emit executable JavaScript", async () => {
  const draft = newEffectDraft("script", "ts");
  const definition = toDefinition(draft);
  expect(definition.typescript).toContain("input: EffectInput");
  expect(definition.script).not.toContain("input: EffectInput");
  expect(effectDefinitionSchema.safeParse(definition).success).toBe(true);
  expect(lintScriptSource(definition.script ?? "")).toEqual([]);
  // This is the fixed local starter, never arbitrary community source.
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(definition.script!).toString("base64")}`
  );
  const output = module.compute({
    effect: { x: 100, y: 100, radius: 200 },
    params: { width: 20 },
    lights: [{ x: 200, y: 200, radius: 100 }],
    mirrors: [],
  });
  expect(sanitizeScriptOutput(output).ok).toBe(true);
  expect(output.polygons).toHaveLength(1);
});

test("TypeScript syntax failures never fall back to a prior JavaScript draft", () => {
  const draft = {
    ...newEffectDraft("script", "ts"),
    typescript: "export function compute(input: ) {}",
  };
  const result = compileTypeScript(draft.typescript);
  expect(result.code).toBeUndefined();
  expect(result.diagnostics[0]).toMatchObject({
    language: "ts",
    severity: "error",
    line: 1,
  });
  expect(toDefinition(draft).script).toBeUndefined();
  expect(effectDefinitionSchema.safeParse(toDefinition(draft)).success).toBe(
    false,
  );
});

test("JavaScript versions remain unchanged and TypeScript remixes retain their source", () => {
  const js = toDefinition(newEffectDraft("script"));
  expect(js.typescript).toBeUndefined();
  expect(draftFromDefinition(js).scriptLanguage).toBe("js");
  const ts = toDefinition(newEffectDraft("script", "ts"));
  const remixed = draftFromDefinition(ts);
  expect(remixed.scriptLanguage).toBe("ts");
  expect(toDefinition(remixed)).toEqual(ts);
});

test("draft recovery preserves both languages and accepts older drafts", () => {
  const draft = {
    ...newEffectDraft("script", "ts"),
    script: "// unfinished JS",
    typescript: "// unfinished TS",
  };
  const recovered = recoveryDraftSchema.parse(
    JSON.parse(JSON.stringify(draft)),
  );
  expect(recovered.script).toBe(draft.script);
  expect(recovered.typescript).toBe(draft.typescript);
  expect(
    recoveryDraftSchema.parse({ ...draft, typescript: "" })
      .typescriptInitialized,
  ).toBe(true);
  const { scriptLanguage: _language, typescript: _source, ...legacy } = draft;
  void _language;
  void _source;
  expect(recoveryDraftSchema.parse(legacy).scriptLanguage).toBe("js");
  expect(
    toDefinition({ ...draft, scriptLanguage: "js" }).typescript,
  ).toBeUndefined();
  expect(toDefinition({ ...draft, kind: "shader" }).typescript).toBeUndefined();
});

test("imports and async compute remain subject to the existing sandbox rules", () => {
  const result = compileTypeScript(
    'import { other } from "external";\nexport async function compute(input: unknown) { return other; }',
  );
  expect(result.diagnostics).toEqual([]);
  expect(
    lintScriptSource(result.code!).some((d) => d.message.includes("Imports")),
  ).toBe(true);
  expect(
    lintScriptSource(result.code!).some((d) =>
      d.message.includes("synchronous"),
    ),
  ).toBe(true);
});

test("TypeScript gets script parameter completion instead of shader helper suggestions", async () => {
  const doc = "export function compute(input: EffectInput) { input.params.";
  const state = EditorState.create({
    doc,
    extensions: [javascript({ typescript: true })],
  });
  const result = await effectCompletionSource(
    "ts",
    newEffectDraft("script").params,
  )(new CompletionContext(state, doc.length, true));
  expect(result?.options.map((o) => o.label)).toEqual(["width"]);
});
