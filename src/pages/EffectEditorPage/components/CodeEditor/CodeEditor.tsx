import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { rust } from "@codemirror/lang-rust";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

import type { EffectDiagnostic } from "@/lib/effects/effectRegistry";
import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import type { EffectParam } from "@shared/effects";
import { useThemeStore } from "@/stores/themeStore";
import { startCompletion } from "@codemirror/autocomplete";
import { effectAuthoringExtensions } from "./authoringExtensions";
import { workshopEditorThemes } from "./editorTheme";

export interface CodeEditorHandle {
  /** Scrolls to and selects the given 1-based line. No-op for lines outside the document. */
  revealLine: (line: number) => void;
}

interface Props {
  language: EffectSourceLanguage;
  value: string;
  onChange: (value: string) => void;
  /** Diagnostics for this language only. Entries without a line are ignored here (the panel lists them). */
  diagnostics: readonly EffectDiagnostic[];
  params: readonly EffectParam[];
  className?: string;
}

/**
 * Shader syntax currently uses approximate Rust/C++ grammars. API assistance
 * is supplied separately by the effect contract; scripts use JavaScript syntax.
 */
function languageExtension(language: EffectSourceLanguage): Extension {
  switch (language) {
    case "wgsl":
      return rust();
    case "glsl":
      return cpp();
    case "js":
      return javascript();
    default: {
      const exhaustive: never = language;
      throw new Error(`Unhandled source language: ${String(exhaustive)}`);
    }
  }
}

function toCodeMirrorDiagnostics(
  view: EditorView,
  diagnostics: readonly EffectDiagnostic[],
): Diagnostic[] {
  const doc = view.state.doc;
  const out: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.line === null) continue;
    const lineNumber = Math.min(doc.lines, Math.max(1, diagnostic.line));
    const line = doc.line(lineNumber);
    out.push({
      from: line.from,
      to: line.to,
      severity: diagnostic.severity,
      message: diagnostic.message,
    });
  }
  return out;
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(
  function CodeEditor(
    { language, value, onChange, diagnostics, params, className },
    ref,
  ) {
    const editorRef = useRef<ReactCodeMirrorRef>(null);
    const theme = useThemeStore((state) => state.theme);

    const extensions = useMemo(
      () => [
        languageExtension(language),
        lintGutter(),
        workshopEditorThemes[theme],
        effectAuthoringExtensions(language, params),
        EditorView.contentAttributes.of({
          "aria-label": `${language.toUpperCase()} effect source`,
        }),
      ],
      [language, params, theme],
    );

    // Push diagnostics into the gutter whenever they change. CodeMirror maps the
    // ranges through later edits by itself, so a slightly stale set stays aligned.
    useEffect(() => {
      const view = editorRef.current?.view;
      if (!view) return;
      view.dispatch(
        setDiagnostics(view.state, toCodeMirrorDiagnostics(view, diagnostics)),
      );
    }, [diagnostics]);

    useImperativeHandle(
      ref,
      () => ({
        revealLine(line: number) {
          const view = editorRef.current?.view;
          if (!view) return;
          const doc = view.state.doc;
          if (line < 1 || line > doc.lines) return;
          const target = doc.line(line);
          view.dispatch({
            selection: { anchor: target.from, head: target.to },
            effects: EditorView.scrollIntoView(target.from, { y: "center" }),
          });
          view.focus();
        },
      }),
      [],
    );

    return (
      <div className={className}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeMirror
              ref={editorRef}
              value={value}
              onChange={onChange}
              extensions={extensions}
              theme="none"
              height="100%"
              className="h-full"
              indentWithTab={false}
              basicSetup={{
                tabSize: 2,
                foldGutter: true,
                highlightActiveLine: true,
                // The contract extension configures completion; avoid a second default setup.
                autocompletion: false,
              }}
            />
          </div>
          <div className="bg-muted/30 text-muted-foreground flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1 text-[11px]">
            <span>
              Effect API{" "}
              <span className="hidden sm:inline">
                · Ctrl+Space for suggestions
              </span>
            </span>
            <button
              type="button"
              className="hover:text-foreground focus-visible:ring-ring min-h-8 rounded px-2 focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => {
                const view = editorRef.current?.view;
                if (view) {
                  view.focus();
                  startCompletion(view);
                }
              }}
            >
              Suggest
            </button>
          </div>
        </div>
      </div>
    );
  },
);
