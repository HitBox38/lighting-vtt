import { useEffect, useMemo, useRef, useState } from "react";
import { EffectPreview } from "./EffectPreview";
import { defaultParamValues, type EffectDefinition } from "@shared/effects";
import type { EffectBackend } from "@/lib/effects/shaderContract";

export type RendererCheck = "checking" | "passed" | "failed" | "unavailable" | "fallback";
export type RendererCheckResults = Record<EffectBackend, RendererCheck>;

function Check({ backend, definition, report }: {
  backend: EffectBackend; definition: EffectDefinition;
  report: (backend: EffectBackend, state: RendererCheck) => void;
}) {
  const actualBackend = useRef<EffectBackend | null>(null);
  const [state, setState] = useState<RendererCheck>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const params = useMemo(() => defaultParamValues(definition.params), [definition.params]);
  const finish = (next: RendererCheck) => setState(actualBackend.current !== null && actualBackend.current !== backend ? "unavailable" : next);
  useEffect(() => { report(backend, state); }, [backend, state, report]);
  return <div className="min-w-0 space-y-1">
    <p className="text-xs" role="status">{backend === "webgl" ? "WebGL" : "WebGPU"}: {state}</p>
    <EffectPreview definition={definition} params={params} preference={backend}
      className="h-28 w-full overflow-hidden rounded border" paused
      onBackend={actual => { actualBackend.current = actual; if (actual !== backend) setState("unavailable"); }}
      onUnavailable={detail => { setMessage(detail); setState("unavailable"); }}
      onCompiled={result => { setMessage(result.status === "error" ? result.diagnostics[0]?.message ?? "Shader compilation failed." : null); finish(result.status === "ok" ? "passed" : result.status === "error" ? "failed" : "fallback"); }}
      onScript={result => { setMessage(result.status === "error" ? result.diagnostics[0]?.message ?? "Script execution failed." : null); finish(result.status === "ok" ? "passed" : "failed"); }} />
    {message && <p className="break-words text-xs" role="alert">{message}</p>}
  </div>;
}

/** Mounted for one exact saved definition; changing version remounts all checks. */
export function RendererChecks({ definition, onChange }: { definition: EffectDefinition; onChange: (results: RendererCheckResults) => void }) {
  const [results, setResults] = useState<RendererCheckResults>({ webgl: "checking", webgpu: "checking" });
  const report = useMemo(() => (backend: EffectBackend, state: RendererCheck) => {
    setResults(current => current[backend] === state ? current : { ...current, [backend]: state });
  }, []);
  useEffect(() => onChange(results), [results, onChange]);
  return <div className="grid grid-cols-2 gap-3">{(["webgl", "webgpu"] as const).map(backend =>
    <Check key={backend} backend={backend} definition={definition} report={report} />)}</div>;
}
