import { useState } from "react";
import { Copy, CornerDownLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EffectSourceLanguage } from "@/lib/effects/shaderContract";
import type { EffectParam } from "@shared/effects";
import { sectionsFor, type Entry } from "../CodeEditor/authoringReference";
import { referenceExample } from "./referenceExample";

interface Props {
  language: EffectSourceLanguage;
  params: readonly EffectParam[];
  context?: Entry | null;
  onInsert?: (source: string) => void;
}

export function ContractReference({
  language,
  params,
  context,
  onInsert,
}: Props) {
  const [search, setSearch] = useState("");
  const { sections, rules } = sectionsFor(language, params);
  const contextual =
    context &&
    sections
      .flatMap((section) => section.entries)
      .find((entry) => entry.signature === context.signature);
  const query = search.trim().toLowerCase();
  const filtered = sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) =>
        `${entry.signature} ${entry.description} ${section.title}`
          .toLowerCase()
          .includes(query),
      ),
    }))
    .filter((section) => section.entries.length);
  const filteredRules = rules.filter((rule) =>
    rule.toLowerCase().includes(query),
  );
  return (
    <div className="space-y-4 text-xs">
      <div>
        <p className="workshop-eyebrow mb-2">
          Reference · {language.toUpperCase()}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search reference"
            placeholder="Search the effect API…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>
      {contextual && !query && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="workshop-eyebrow mb-2">At your cursor</p>
          <ReferenceEntry
            entry={contextual}
            language={language}
            onInsert={onInsert}
          />
        </section>
      )}
      {!contextual && !query && (
        <p className="text-muted-foreground leading-relaxed">
          Select an API symbol in your code to see its documentation here.
        </p>
      )}
      {filtered.map((section, index) => (
        <details
          key={`${language}:${section.title}:${Boolean(query)}`}
          open={query ? true : index === 0}
          className="group rounded-lg border"
        >
          <summary className="cursor-pointer px-3 py-2.5 font-medium">
            {section.title}
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              {section.entries.length}
            </span>
          </summary>
          <div className="space-y-4 border-t p-3">
            {section.entries.map((entry) => (
              <ReferenceEntry
                key={entry.signature}
                entry={entry}
                language={language}
                onInsert={onInsert}
              />
            ))}
          </div>
        </details>
      ))}
      {filteredRules.length > 0 && (
        <details
          key={`rules:${Boolean(query)}`}
          open={query ? true : undefined}
          className="rounded-lg border"
        >
          <summary className="cursor-pointer px-3 py-2.5 font-medium">
            Compatibility & limits
          </summary>
          <ul className="list-disc space-y-2 border-t py-3 pl-7 pr-3 leading-relaxed text-muted-foreground">
            {filteredRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
      )}
      {!filtered.length && !filteredRules.length && (
        <p role="status" className="py-5 text-center text-muted-foreground">
          No matches. Try “color”, “light”, or “param”.
        </p>
      )}
    </div>
  );
}

function ReferenceEntry({
  entry,
  language,
  onInsert,
}: {
  entry: Entry;
  language: EffectSourceLanguage;
  onInsert?: (source: string) => void;
}) {
  const example = referenceExample(entry, language);
  return (
    <div className="space-y-2">
      <code className="block break-words text-[11px] text-foreground">
        {entry.signature}
      </code>
      <p className="leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      {example && (
        <details>
          <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
            Example
          </summary>
          <pre className="my-2 overflow-x-auto rounded-md bg-muted/50 p-2 text-[11px]">
            {example}
          </pre>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              aria-label={`Copy example for ${entry.signature}`}
              onClick={() =>
                void navigator.clipboard
                  .writeText(example)
                  .then(() => toast.success("Example copied."))
                  .catch(() =>
                    toast.error(
                      "Could not copy. Select the example text to copy it.",
                    ),
                  )
              }
            >
              <Copy className="size-3" />
              Copy
            </Button>
            {onInsert && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                aria-label={`Insert example for ${entry.signature}`}
                onClick={() => onInsert(example)}
              >
                <CornerDownLeft className="size-3" />
                Insert
              </Button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
