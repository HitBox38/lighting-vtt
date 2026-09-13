import { coerceParamValues, type EffectParam, type EffectParamValues } from "@shared/effects";

/** Follow edited defaults until the author deliberately overrides a preview value. */
export function reconcilePreviewValues(previous: readonly EffectParam[], next: EffectParam[], values: EffectParamValues): EffectParamValues {
  const previousByKey = new Map(previous.map(p => [p.key, p]));
  const nextKeys = new Set(next.map(p => p.key));
  const updated = Object.fromEntries(next.map((param, index) => {
    const old = previousByKey.get(param.key) ?? (previous[index] && !nextKeys.has(previous[index].key) ? previous[index] : undefined);
    const value = old ? values[old.key] : undefined;
    const overridden = old && old.type === param.type && value !== undefined && value !== old.default;
    return [param.key, overridden ? value : param.default];
  }));
  return coerceParamValues(next, updated);
}
