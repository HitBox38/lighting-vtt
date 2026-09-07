import {
  autocompletion,
  snippetCompletion,
  type Completion,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { localCompletionSource } from "@codemirror/lang-javascript";
import {
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import { hoverTooltip, showTooltip, type Tooltip } from "@codemirror/view";
import type { EffectParam } from "@shared/effects";
import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import { apiEntries, parameterEntries, type Entry } from "./authoringReference";
import { SCRIPT_TYPES } from "./typescriptCompiler";

/** Language parsers handle comments/strings, including multiline block comments. */
function inNonCode(state: EditorState, pos: number): boolean {
  for (
    let node = syntaxTree(state).resolveInner(pos, -1);
    node;
    node = node.parent!
  ) {
    if (/Comment|String|Template|CharLiteral|Character/.test(node.name))
      return true;
  }
  return false;
}

function snippets(language: EffectSourceLanguage): Completion[] {
  if (language === "js" || language === "ts")
    return [
      snippetCompletion(
        language === "ts"
          ? "export function compute(input: EffectInput): EffectOutput {\n\treturn { polygons: [], segments: [] };\n}"
          : "export function compute(input) {\n\treturn { polygons: [], segments: [] };\n}",
        {
          label: "compute",
          type: "function",
          detail: "Entry point · snippet",
          info: "Create the synchronous geometry entry point. Input contains this effect, controls, visible lights, and mirrors.",
        },
      ),
      snippetCompletion(
        "{ start: { x: ${x1}, y: ${y1} }, end: { x: ${x2}, y: ${y2} } }",
        {
          label: "segment",
          type: "text",
          detail: "Geometry · snippet",
          info: "A lit line segment in map pixels. Add it to the returned segments array.",
        },
      ),
      ...(language === "ts"
        ? [
            snippetCompletion(SCRIPT_TYPES, {
              label: "effectTypes",
              type: "text",
              detail: "Effect API types · snippet",
              info: "Add self-contained Point, Segment, EffectInput, and EffectOutput declarations once at the top of your script.",
            }),
          ]
        : []),
    ];
  const wgsl = language === "wgsl";
  return [
    snippetCompletion(
      wgsl
        ? "fn effectMain(fx: EffectInput) -> vec4<f32> {\n\treturn vec4<f32>(${1:1.0}, ${2:0.7}, ${3:0.3}, ${4:1.0});\n}"
        : "vec4 effectMain(EffectInput fx) {\n\treturn vec4(${1:1.0}, ${2:0.7}, ${3:0.3}, ${4:1.0});\n}",
      {
        label: "effectMain",
        type: "function",
        detail: "Entry point · snippet",
        info: "Return the effect's RGBA colour and opacity.",
      },
    ),
    snippetCompletion("1.0 - smoothstep(${0.0}, ${1.0}, fx.dist)", {
      label: "softFalloff",
      type: "text",
      detail: "Soft edge · snippet",
      info: "Fade from the centre toward the effect's radius. Use as opacity in your returned colour.",
    }),
    snippetCompletion("0.5 + 0.5 * sin(fx.time * ${2.0})", {
      label: "timePulse",
      type: "text",
      detail: "Animation · snippet",
      info: "A repeating 0–1 pulse. The editable argument controls speed.",
    }),
  ];
}

/** Contextual API hints, deliberately limited to the documented contract (no inferred types). */
export function effectCompletionSource(
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): CompletionSource {
  const entries = apiEntries(language, params);
  const paramDocs = parameterEntries(language, params);
  const rootSnippets = snippets(language);
  const slotOptions = params.map(
    (param, index): Completion => ({
      label: String(index),
      displayLabel: `${index} · ${param.label || param.key}`,
      detail: param.type,
      info: paramDocs[index].description,
      type: "constant",
    }),
  );
  return (context) => {
    if (inNonCode(context.state, context.pos)) return null;
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const slot =
      language !== "js" &&
      language !== "ts" &&
      /\b(effectParamVec|effectParam)\(\s*(\d*)$/.exec(before);
    if (slot)
      return {
        from: context.pos - slot[2].length,
        options: slotOptions,
        validFor: /^\d*$/,
      };

    const path = context.matchBefore(/[A-Za-z_][\w]*(?:\s*\.\s*[\w]*)*/);
    if (!path && !context.explicit) return null;
    const raw = path?.text ?? "";
    // Do not suggest global symbols after an unrelated member access or a number.
    if (!path && /[\w.]$/.test(before)) return null;
    const normalized = raw.replace(/\s/g, "");
    const dot = normalized.lastIndexOf(".");
    const parent = dot < 0 ? "" : normalized.slice(0, dot + 1);
    const member =
      dot < 0 ? raw : raw.slice(raw.lastIndexOf(".") + 1).trimStart();
    const from = context.pos - member.length;
    const options: Completion[] = entries
      .filter((entry) => {
        const lastDot = entry.name.lastIndexOf(".");
        return (lastDot < 0 ? "" : entry.name.slice(0, lastDot + 1)) === parent;
      })
      .filter(
        (entry) =>
          !rootSnippets.some((snippet) => snippet.label === entry.name),
      )
      .map((entry) => ({
        label: entry.name.slice(parent.length),
        type: entry.signature.includes("(") ? "function" : "property",
        detail: entry.signature,
        info: entry.description,
      }));
    if (!parent) {
      options.push(...rootSnippets);
      options.push(
        ...(language === "js" || language === "ts"
          ? [
              {
                label: "input",
                type: "variable",
                info: "Effect, authored controls, visible lights, and mirrors.",
              },
            ]
          : [
              {
                label: "fx",
                type: "variable",
                info: "Coordinates, distance, time, radius, and rotation for this fragment.",
              },
            ]),
      );
      if (language !== "js" && language !== "ts")
        options.push(
          ...params.map((param, index) => ({
            label: param.key,
            detail: `Control · ${paramDocs[index].signature}`,
            info: paramDocs[index].description,
            apply: paramDocs[index].signature,
            type: "constant",
          })),
        );
    }
    return options.length ? { from, options, validFor: /^\w*$/ } : null;
  };
}

export function documentationAt(
  state: EditorState,
  pos: number,
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): { from: number; to: number; entry: Entry } | null {
  if (inNonCode(state, pos)) return null;
  const line = state.doc.lineAt(pos);
  const offset = pos - line.from;
  for (const match of line.text.matchAll(
    /\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\(\s*\d+\s*\))?/g,
  )) {
    if (match.index > offset || match.index + match[0].length < offset)
      continue;
    const name = match[0].replace(/\s/g, "");
    const entry =
      parameterEntries(language, params).find(
        (entry) => entry.signature === name,
      ) ??
      apiEntries(language, params).find(
        (entry) => entry.name === name.replace(/\(.*/, ""),
      );
    if (entry)
      return {
        from: line.from + match.index,
        to: line.from + match.index + match[0].length,
        entry,
      };
  }
  return null;
}

function documentationDom(entry: Entry): HTMLElement {
  const dom = document.createElement("div");
  dom.className = "cm-effect-doc";
  const signature = dom.appendChild(document.createElement("code"));
  signature.textContent = entry.signature;
  const description = dom.appendChild(document.createElement("p"));
  description.textContent = entry.description;
  return dom;
}

/** Small contract signature hints; compiler diagnostics remain the source of validation. */
export function callDocumentation(
  state: EditorState,
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): Entry | null {
  const pos = state.selection.main.head;
  if (!state.selection.main.empty || inNonCode(state, pos)) return null;
  const before = state.sliceDoc(Math.max(0, pos - 500), pos);
  const call = /\b(effectParamVec|effectParam|sampleMap)\(\s*([^()]*)$/.exec(
    before,
  );
  if (!call || language === "js" || language === "ts") return null;
  const entry = apiEntries(language, params).find(
    (entry) => entry.name === call[1],
  );
  if (!entry) return null;
  const slot = /^\d+$/.test(call[2].trim()) ? Number(call[2].trim()) : -1;
  const param = parameterEntries(language, params)[slot];
  return {
    ...entry,
    description:
      param && call[1] !== "sampleMap" ? param.description : entry.description,
  };
}

export function effectAuthoringExtensions(
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): Extension {
  const signatures = StateField.define<Tooltip | null>({
    create: () => null,
    update(value, transaction) {
      if (!transaction.docChanged && !transaction.selection) return value;
      const entry = callDocumentation(transaction.state, language, params);
      return entry
        ? {
            pos: transaction.state.selection.main.head,
            above: true,
            create: () => ({ dom: documentationDom(entry) }),
          }
        : null;
    },
    provide: (field) => showTooltip.from(field),
  });
  return [
    autocompletion({
      override: [
        effectCompletionSource(language, params),
        ...(language === "js" || language === "ts"
          ? [localCompletionSource]
          : []),
      ],
      activateOnTyping: true,
      positionInfo(view, list, option, info, space) {
        const right = space.right - list.right - 8;
        const left = list.left - space.left - 8;
        const beside = Math.max(right, left) >= 260;
        const width = Math.min(
          320,
          beside ? Math.max(right, left) : space.right - space.left - 16,
        );
        const height = info.bottom - info.top;
        let x: number;
        let y: number;
        let availableHeight: number;
        if (beside) {
          x = right >= 260 ? list.right + 4 : list.left - width - 4;
          y = Math.max(
            space.top + 4,
            Math.min(option.top, space.bottom - height - 4),
          );
          availableHeight = space.bottom - y - 4;
        } else {
          // Keep docs outside the list, so they never cover tappable suggestions.
          x = Math.max(
            space.left + 8,
            Math.min(list.left, space.right - width - 8),
          );
          const below = space.bottom - list.bottom - 8;
          const above = list.top - space.top - 8;
          availableHeight = Math.max(below, above);
          y =
            below >= above
              ? list.bottom + 4
              : list.top - Math.min(height, above) - 4;
        }
        return {
          style: `left: ${(x - list.left) / view.scaleX}px; top: ${(y - list.top) / view.scaleY}px; width: ${width / view.scaleX}px; max-width: ${width / view.scaleX}px; max-height: ${Math.max(24, availableHeight) / view.scaleY}px; overflow-y: auto; box-sizing: border-box`,
        };
      },
    }),
    hoverTooltip((view, pos) => {
      const doc = documentationAt(view.state, pos, language, params);
      return doc
        ? {
            pos: doc.from,
            end: doc.to,
            above: true,
            create: () => ({ dom: documentationDom(doc.entry) }),
          }
        : null;
    }),
    signatures,
  ];
}
