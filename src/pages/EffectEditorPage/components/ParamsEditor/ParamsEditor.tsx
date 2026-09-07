import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import { EffectParamFields } from "@/components/molecules/EffectParamFields";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  EFFECT_LIMITS,
  type EffectParam,
  type EffectParamType,
  type EffectParamValues,
} from "@shared/effects";
import type { DraftIssues } from "@/pages/EffectEditorPage/hooks/useEffectDraft";

interface Props {
  kind?: "shader" | "script";
  params: EffectParam[];
  onChange: (params: EffectParam[]) => void;
  issues: DraftIssues;
  values: EffectParamValues;
  onValuesChange: (values: EffectParamValues) => void;
}

const TYPE_LABELS: Record<EffectParamType, string> = {
  number: "Number",
  color: "Colour",
  boolean: "Toggle",
};

const PARAM_TYPES: readonly EffectParamType[] = ["number", "color", "boolean"];

function uniqueKey(existing: readonly EffectParam[], base: string): string {
  const taken = new Set(existing.map((param) => param.key));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** A fresh param of `type`, keeping key and label from `from` when provided. */
function blankParam(
  type: EffectParamType,
  from?: Pick<EffectParam, "key" | "label">,
  existing: readonly EffectParam[] = [],
): EffectParam {
  const key = from?.key ?? uniqueKey(existing, "param");
  const label = from?.label ?? "Param";
  switch (type) {
    case "number":
      return { key, label, type, min: 0, max: 1, step: 0.01, default: 0.5 };
    case "color":
      return { key, label, type, default: "#ffffff" };
    case "boolean":
      return { key, label, type, default: false };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled effect param type: ${String(exhaustive)}`);
    }
  }
}

function parseNumber(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Table editor for the declared params. Rows map 1:1 onto `uParams` slots, so
 * the slot index is shown next to each row: that is what `effectParam(i)` reads.
 */
export function ParamsEditor({
  params,
  onChange,
  issues,
  kind = "shader",
  values,
  onValuesChange,
}: Props) {
  const atLimit = params.length >= EFFECT_LIMITS.maxParams;

  const replaceAt = (index: number, next: EffectParam) => {
    const copy = params.slice();
    copy[index] = next;
    onChange(copy);
  };

  const removeAt = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= params.length) return;
    const copy = params.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(target, 0, row);
    onChange(copy);
  };

  const add = () => {
    if (atLimit) return;
    onChange([...params, blankParam("number", undefined, params)]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {params.length} / {EFFECT_LIMITS.maxParams} controls.{" "}
          <span className="block">Tune here. Define defaults in settings.</span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={atLimit}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add control
        </Button>
      </div>

      {params.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
          No params yet. Params become sliders, colour pickers and toggles for
          anyone placing this effect.
        </p>
      ) : null}

      <ul className="space-y-2">
        {params.map((param, index) => (
          <ParamRow
            key={index}
            index={index}
            param={param}
            issues={issues}
            isFirst={index === 0}
            isLast={index === params.length - 1}
            kind={kind}
            values={values}
            onValuesChange={onValuesChange}
            onChange={(next) => replaceAt(index, next)}
            onRemove={() => removeAt(index)}
            onMove={(delta) => move(index, delta)}
          />
        ))}
      </ul>
    </div>
  );
}

interface RowProps {
  index: number;
  param: EffectParam;
  issues: DraftIssues;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: EffectParam) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  kind: "shader" | "script";
  values: EffectParamValues;
  onValuesChange: (values: EffectParamValues) => void;
}

function ParamRow({
  index,
  param,
  issues,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
  kind,
  values,
  onValuesChange,
}: RowProps) {
  const [expanded, setExpanded] = useState(param.label === "Param");
  const hasIssues = [...issues.keys()].some((key) =>
    key.startsWith(`params.${index}.`),
  );
  const settingsOpen = expanded || hasIssues;
  const issueFor = (field: string) => issues.get(`params.${index}.${field}`);
  const keyIssue = issueFor("key");
  const labelIssue = issueFor("label");

  const changeType = (type: EffectParamType) => {
    if (type === param.type) return;
    onChange(blankParam(type, { key: param.key, label: param.label }));
  };

  return (
    <li
      className={cn(
        "rounded-lg border bg-card/40",
        hasIssues && "border-destructive/60",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-2">
          <EffectParamFields
            params={[param]}
            values={values}
            onChange={(next) => onValuesChange({ ...values, ...next })}
          />
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
            <span>
              Preview value · saved default{" "}
              <span className="font-mono">{String(param.default)}</span>
            </span>
            <code>
              {kind === "script"
                ? `input.params.${param.key}`
                : `slot ${index}`}
            </code>
          </div>
        </div>
        <Button
          variant={settingsOpen ? "secondary" : "ghost"}
          size="icon"
          className="size-7 shrink-0"
          aria-label={`${param.label} settings`}
          aria-expanded={settingsOpen}
          onClick={() => setExpanded(!settingsOpen)}
        >
          <Settings2 className="size-4" />
        </Button>
      </div>
      <div
        className={cn("border-t bg-muted/20 p-3", !settingsOpen && "hidden")}
      >
        <div className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
            <Field label="Key" issue={keyIssue}>
              <Input
                aria-label={`Control ${index + 1} key`}
                value={param.key}
                onChange={(event) =>
                  onChange({ ...param, key: event.target.value })
                }
                placeholder="speed"
                maxLength={EFFECT_LIMITS.maxParamKeyLength}
                aria-invalid={Boolean(keyIssue)}
                className="h-8 font-mono text-xs"
                spellCheck={false}
              />
            </Field>
            <Field label="Label" issue={labelIssue}>
              <Input
                aria-label={`Control ${index + 1} label`}
                value={param.label}
                onChange={(event) =>
                  onChange({ ...param, label: event.target.value })
                }
                placeholder="Speed"
                maxLength={EFFECT_LIMITS.maxParamLabelLength}
                aria-invalid={Boolean(labelIssue)}
                className="h-8 text-xs"
              />
            </Field>
            <Field label="Type">
              <Select
                value={param.type}
                onValueChange={(value) => changeType(value as EffectParamType)}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  aria-label={`Control ${index + 1} type`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <TypeFields param={param} issueFor={issueFor} onChange={onChange} />
          </div>

          <div className="mt-5 flex shrink-0 flex-col gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive h-6 w-6"
              onClick={onRemove}
              aria-label="Remove param"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-7 text-xs"
          onClick={() =>
            onChange({
              ...param,
              default: values[param.key] ?? param.default,
            } as EffectParam)
          }
        >
          Use preview value as default
        </Button>
      </div>
    </li>
  );
}

interface TypeFieldsProps {
  param: EffectParam;
  issueFor: (field: string) => string | undefined;
  onChange: (next: EffectParam) => void;
}

function TypeFields({ param, issueFor, onChange }: TypeFieldsProps) {
  switch (param.type) {
    case "number": {
      const numberInput = (field: "min" | "max" | "step" | "default") => (
        <Field
          key={field}
          label={
            field === "default"
              ? "Saved default"
              : field[0].toUpperCase() + field.slice(1)
          }
          issue={issueFor(field)}
        >
          <Input
            aria-label={`${param.label} ${field}`}
            type="number"
            value={param[field]}
            step="any"
            onChange={(event) =>
              onChange({
                ...param,
                [field]: parseNumber(event.target.value, param[field]),
              })
            }
            aria-invalid={Boolean(issueFor(field))}
            className="h-8 font-mono text-xs"
          />
        </Field>
      );
      return (
        <>
          {numberInput("min")}
          {numberInput("max")}
          {numberInput("step")}
          {numberInput("default")}
        </>
      );
    }
    case "color":
      return (
        <Field
          label="Saved default"
          issue={issueFor("default")}
          className="sm:col-span-3"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={param.default.slice(0, 7)}
              onChange={(event) =>
                onChange({ ...param, default: event.target.value })
              }
              className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
              aria-label="Default colour"
            />
            <Input
              aria-label={`${param.label} default hex color`}
              value={param.default}
              onChange={(event) =>
                onChange({ ...param, default: event.target.value })
              }
              aria-invalid={Boolean(issueFor("default"))}
              className="h-8 w-28 font-mono text-xs"
              spellCheck={false}
            />
          </div>
        </Field>
      );
    case "boolean":
      return (
        <Field label="Saved default">
          <div className="flex h-8 items-center gap-2">
            <Switch
              aria-label={`${param.label} default`}
              checked={param.default}
              onCheckedChange={(checked) =>
                onChange({ ...param, default: checked })
              }
            />
            <span className="text-muted-foreground text-xs">
              {param.default ? "On" : "Off"}
            </span>
          </div>
        </Field>
      );
    default: {
      const exhaustive: never = param;
      throw new Error(`Unhandled effect param type: ${String(exhaustive)}`);
    }
  }
}

function Field({
  label,
  issue,
  className,
  children,
}: {
  label: string;
  issue?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label
        className={cn(
          "text-[11px]",
          issue ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
      </Label>
      {children}
      {issue ? (
        <p className="text-destructive text-[11px] leading-tight">{issue}</p>
      ) : null}
    </div>
  );
}
