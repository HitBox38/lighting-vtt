import { describe, expect, test } from "bun:test";
import {
  readWorkbenchLayouts,
  presetLayout,
  DEFAULT_LAYOUTS,
} from "../src/pages/EffectEditorPage/hooks/workbenchLayout";
import { referenceExample } from "../src/pages/EffectEditorPage/components/ContractReference/referenceExample";
import { parameterEntries } from "../src/pages/EffectEditorPage/components/CodeEditor/authoringReference";
import { queuePreviewBoot } from "../src/lib/effects/previewBootQueue";

describe("Workbench layout recovery", () => {
  test("restores valid groups and rejects malformed preferences independently", () => {
    expect(readWorkbenchLayouts("{")).toEqual(DEFAULT_LAYOUTS);
    expect(readWorkbenchLayouts("null")).toEqual(DEFAULT_LAYOUTS);
    const recovered = readWorkbenchLayouts(
      JSON.stringify({
        workbench: { source: 67, preview: 33 },
        reference: { code: -1, reference: 101 },
        diagnostics: { editor: 80, diagnostics: 80 },
        inspector: { stage: "55", inspector: 45 },
      }),
    );
    expect(recovered.workbench).toEqual({ source: 67, preview: 33 });
    expect(recovered.reference).toEqual(DEFAULT_LAYOUTS.reference);
    expect(recovered.diagnostics).toEqual(DEFAULT_LAYOUTS.diagnostics);
    expect(recovered.inspector).toEqual(DEFAULT_LAYOUTS.inspector);
  });
  test("focus presets stay within reachable pane limits", () => {
    for (const preset of ["Balanced", "Code focus", "Preview focus"] as const) {
      const sizes = presetLayout(preset);
      expect(sizes.source + sizes.preview).toBe(100);
      expect(sizes.source).toBeGreaterThanOrEqual(35);
      expect(sizes.preview).toBeGreaterThanOrEqual(30);
    }
  });
});

test("reference insertion keeps shader slots and script keys intact", () => {
  const params = [
    { key: "tint", label: "Tint", type: "color" as const, default: "#ffb347" },
  ];
  expect(referenceExample(parameterEntries("wgsl", params)[0], "wgsl")).toBe(
    "effectParamVec(0)",
  );
  expect(referenceExample(parameterEntries("ts", params)[0], "ts")).toBe(
    "input.params.tint",
  );
  expect(
    referenceExample(
      {
        signature: "fn effectMain(fx: EffectInput) -> vec4<f32>",
        description: "",
      },
      "wgsl",
    ),
  ).toContain("return vec4<f32>");
  expect(
    referenceExample(
      { signature: "vec4 effectMain(EffectInput fx)", description: "" },
      "glsl",
    ),
  ).toContain("return vec4(");
});

test("a replacement preview waits for cancelled renderer cleanup, including failures", async () => {
  const events: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cancelled = queuePreviewBoot(async () => {
    events.push("initializing");
    await gate;
    events.push("disposed");
    throw new Error("cancelled");
  });
  const failure = cancelled.catch(() => events.push("handled"));
  const next = queuePreviewBoot(async () => {
    events.push("replacement");
    return "ready";
  });
  await Promise.resolve();
  expect(events).toEqual(["initializing"]);
  release();
  await failure;
  expect(await next).toBe("ready");
  expect(events.indexOf("disposed")).toBeLessThan(
    events.indexOf("replacement"),
  );
});
