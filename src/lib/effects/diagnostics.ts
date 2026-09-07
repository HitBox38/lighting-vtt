import type { EffectSourceLanguage } from "./shaderContract";

export type DiagnosticSeverity = "error" | "warning" | "info";

/**
 * One problem in an author's source, in a shape both the editor gutter and the
 * scene context menu can show. `line` is 1-based and relative to the author's
 * code (never to the assembled program or the sandbox bootstrap); `null` means
 * the problem is not attributable to a line.
 */
export interface EffectDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  line: number | null;
  language: EffectSourceLanguage;
}
