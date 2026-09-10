import { expect, test } from "bun:test";
import { createDeferredAnalyticsScripts } from "../src/lib/deferredAnalyticsScripts";

function script(src: string) {
  return { src, removeAttribute(name: string) { if (name === "src") this.src = ""; } } as HTMLScriptElement;
}

test("delays only replay/survey downloads, preserving SDK script nodes and remote config", () => {
  const deferred = createDeferredAnalyticsScripts();
  const paths = ["1.428.3/posthog-recorder.js", "recorder.js?v=1", "surveys.js"];
  const scripts = paths.map((path) => script(`https://assets.example/static/${path}`));
  const remoteConfig = script("https://assets.example/array/project/config.js");
  scripts.forEach((node) => {
    expect(deferred.prepare(node)).toBe(node);
    expect(node.src).toBe("");
  });
  expect(deferred.prepare(remoteConfig).src).toContain("config.js");
  deferred.resume();
  scripts.forEach((node, i) => expect(node.src).toBe(`https://assets.example/static/${paths[i]}`));
  const later = script("https://assets.example/static/surveys.js");
  expect(deferred.prepare(later).src).toContain("surveys.js");
  deferred.resume();
});
