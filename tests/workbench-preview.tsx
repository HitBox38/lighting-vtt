import { ConvexError } from "convex/values";
import type { Id } from "../convex/_generated/dataModel";
import { EffectReleaseReview } from "../src/components/organisms/EffectRelease/EffectRelease";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { PreviewStage } from "../src/components/organisms/EffectPreview/PreviewStage";
import { RendererChecks } from "../src/components/organisms/EffectPreview/RendererChecks";
import { ParamsEditor } from "../src/pages/EffectEditorPage/components/ParamsEditor/ParamsEditor";
import { useEffectDraft, draftFromDefinition } from "../src/pages/EffectEditorPage/hooks/useEffectDraft";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { defaultParamValues } from "../shared/effects";
import { Button } from "../src/components/ui/button";

// Local-only fixture: uses the production preview, controls and recovery hook.
// No auth, backend mutations, uploads, or production data.
export function Fixture({ index }: { index: number }) {
  const [published, setPublished] = useState<number | null>(null);
  const [failRelease, setFailRelease] = useState(true);
  const [account, setAccount] = useState("fixture-a");
  const state = useEffectDraft(draftFromDefinition(EFFECT_STARTERS[index]), `workshop:draft:v2:${account}:fixture@${index}`);
  const [values, setValues] = useState(() => defaultParamValues(state.draft.params));
  const [width, setWidth] = useState(640);
  const [checks, setChecks] = useState(false);
  const [resolution, setResolution] = useState(2);
  return <main className="space-y-4 p-6">
    <h1 className="text-xl">Effect authoring regression preview</h1>
    <label>Renderer pixel ratio <select aria-label="Renderer pixel ratio" value={resolution} onChange={e => setResolution(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label>
    <p>Device pixel ratio: {window.devicePixelRatio}. Account: {account}</p>
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setWidth(width === 640 ? 380 : 640)}>Resize preview</Button>
      <Button onClick={() => state.reset(draftFromDefinition(state.definition))}>Save fixture version</Button>
      <Button onClick={() => setAccount(account === "fixture-a" ? "fixture-b" : "fixture-a")}>Switch fixture account</Button>
      <Button onClick={() => setChecks(!checks)}>Check renderers</Button>
    </div>
    <p role="status">{state.dirty ? "Unsaved changes" : "Clean version"} · {state.recovered ? "Recovered draft" : state.recoveryStatus}</p>
    {state.recoveryCandidate && <div role="alert"><p>Recover unfinished draft?</p><Button onClick={() => state.resolveRecovery(true)}>Restore draft</Button><Button onClick={() => state.resolveRecovery(false)}>Discard draft</Button></div>}
    <label>Effect name <input aria-label="Effect name" className="border p-2" value={state.draft.name} onChange={e => state.patch({ name: e.target.value })} /></label>
    <div style={{ width, maxWidth: "100%", height: 420 }} className="flex"><PreviewStage fill resolution={resolution} definition={state.definition} params={values} /></div>
    {checks && <RendererChecks definition={state.definition} onChange={() => {}} />}
    <section style={{ maxWidth: 640 }}>
      <label><input type="checkbox" checked={failRelease} onChange={e => setFailRelease(e.target.checked)} />Simulate a release cooldown</label>
      <EffectReleaseReview effectId={"fixture-effect" as Id<"effects">} version={1} definition={state.definition}
        status={{ enabled: true, curator: true, publishedVersion: published, retryAt: null, reason: null }} capture={() => {}}
        release={async () => { if (failRelease) throw new ConvexError({ kind: "RateLimited", name: "curatorPublishEffect", retryAfter: 5000 }); setPublished(1); return null; }} />
    </section>
    <section style={{ maxWidth: 640 }}><ParamsEditor kind={state.draft.kind} params={state.draft.params} onChange={state.setParams} issues={state.issues} values={values} onValuesChange={setValues} /></section>
  </main>;
}
export function App() {
  const [index, setIndex] = useState(0);
  return <><nav className="flex flex-wrap gap-2 p-4">{EFFECT_STARTERS.map((d, i) => <Button key={d.name} variant="outline" onClick={() => setIndex(i)}>{d.name}</Button>)}</nav><Fixture key={index} index={index} /></>;
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App />);
