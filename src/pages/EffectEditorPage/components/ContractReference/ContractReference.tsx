import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import type { EffectParam } from "@shared/effects";
import { sectionsFor } from "../CodeEditor/authoringReference";

interface Props {
  language: EffectSourceLanguage;
  params: readonly EffectParam[];
}
/** Cheat sheet for the fixed shader or script contract, shown next to the code tabs. */
export function ContractReference({ language, params }: Props) {
  const { sections, rules } = sectionsFor(language, params);
  return (
    <div className="space-y-4 text-xs">
      {sections
        .filter((section) => section.entries.length > 0)
        .map((section) => (
          <section key={section.title}>
            <h4 className="text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              {section.title}
            </h4>
            <dl className="space-y-1.5">
              {section.entries.map((entry) => (
                <div key={entry.signature}>
                  <dt className="font-mono text-[11px] break-all">
                    {entry.signature}
                  </dt>
                  <dd className="text-muted-foreground">{entry.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      <section>
        <h4 className="text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
          Rules
        </h4>
        <ul className="text-muted-foreground list-disc space-y-1 pl-4">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
