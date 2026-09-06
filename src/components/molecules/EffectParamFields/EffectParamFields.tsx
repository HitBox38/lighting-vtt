import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  coerceParamValues,
  type BooleanEffectParam,
  type ColorEffectParam,
  type EffectParam,
  type EffectParamValues,
  type NumberEffectParam,
} from "@shared/effects";

interface FieldsProps {
  params: readonly EffectParam[];
  values: EffectParamValues;
  onChange: (next: EffectParamValues) => void;
  disabled?: boolean;
}

/**
 * Renders one input per declared param and reports the full, coerced value
 * map on every change. Callers never see a value outside the declared range.
 */
export function EffectParamFields({ params, values, onChange, disabled = false }: FieldsProps) {
  const coerced = coerceParamValues(params, values);

  if (params.length === 0) {
    return <p className="text-muted-foreground text-xs">This effect has no adjustable parameters.</p>;
  }

  const setValue = (key: string, value: EffectParamValues[string]) => {
    onChange(coerceParamValues(params, { ...coerced, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-3">
      {params.map((param) => {
        switch (param.type) {
          case "number":
            return (
              <NumberField
                key={param.key}
                param={param}
                value={coerced[param.key] as number}
                disabled={disabled}
                onChange={(value) => setValue(param.key, value)}
              />
            );
          case "color":
            return (
              <ColorField
                key={param.key}
                param={param}
                value={coerced[param.key] as string}
                disabled={disabled}
                onChange={(value) => setValue(param.key, value)}
              />
            );
          case "boolean":
            return (
              <BooleanField
                key={param.key}
                param={param}
                value={coerced[param.key] as boolean}
                disabled={disabled}
                onChange={(value) => setValue(param.key, value)}
              />
            );
          default: {
            const exhaustive: never = param;
            throw new Error(`Unhandled effect param type: ${String(exhaustive)}`);
          }
        }
      })}
    </div>
  );
}

interface FieldProps<P extends EffectParam, V> {
  param: P;
  value: V;
  disabled: boolean;
  onChange: (value: V) => void;
}

/** Number of decimals needed to display `step` exactly, capped so the UI stays readable. */
function decimalsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const text = step.toString();
  const exponentIndex = text.indexOf("e-");
  if (exponentIndex !== -1) {
    return Math.min(6, Number(text.slice(exponentIndex + 2)));
  }
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : Math.min(6, text.length - dot - 1);
}

function NumberField({ param, value, disabled, onChange }: FieldProps<NumberEffectParam, number>) {
  const id = useId();
  const decimals = decimalsFor(param.step);
  const formatted = value.toFixed(decimals);
  // The text box keeps what the user typed ("1.", "-") until blur; the slider is always the real value.
  const [draft, setDraft] = useState(formatted);
  const [editing, setEditing] = useState(false);
  const shown = editing ? draft : formatted;

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange(parsed);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="truncate text-xs">
          {param.label}
        </Label>
        <Input
          id={`${id}-text`}
          aria-label={`${param.label} value`}
          type="number"
          inputMode="decimal"
          className="h-7 w-24 px-2 text-right text-xs"
          min={param.min}
          max={param.max}
          step={param.step}
          value={shown}
          disabled={disabled}
          onFocus={() => {
            setDraft(formatted);
            setEditing(true);
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            commit(event.target.value);
          }}
          onBlur={() => setEditing(false)}
        />
      </div>
      <input
        id={id}
        type="range"
        className="accent-primary h-1.5 w-full cursor-pointer"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        disabled={disabled}
        onChange={(event) => commit(event.target.value)}
        aria-label={param.label}
      />
    </div>
  );
}

function ColorField({ param, value, disabled, onChange }: FieldProps<ColorEffectParam, string>) {
  const id = useId();
  // <input type="color"> only speaks #RRGGBB; keep any alpha byte the author stored.
  const rgb = value.slice(0, 7);
  const alphaSuffix = value.length === 9 ? value.slice(7) : "";

  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="truncate text-xs">
        {param.label}
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-[11px]">{value.toUpperCase()}</span>
        <input
          id={id}
          type="color"
          className="border-input h-7 w-9 cursor-pointer rounded-md border bg-transparent p-0.5"
          value={rgb}
          disabled={disabled}
          onChange={(event) => onChange(`${event.target.value}${alphaSuffix}`)}
          aria-label={param.label}
        />
      </div>
    </div>
  );
}

function BooleanField({ param, value, disabled, onChange }: FieldProps<BooleanEffectParam, boolean>) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="truncate text-xs">
        {param.label}
      </Label>
      <Switch id={id} checked={value} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
