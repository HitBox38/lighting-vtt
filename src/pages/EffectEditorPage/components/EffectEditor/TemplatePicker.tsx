import { useState } from "react";
import { ArrowUpRight, Braces, Code2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarterThumbnail } from "./StarterThumbnail";
import { EFFECT_STARTERS } from "@shared/effectStarters";
import {
  draftFromDefinition,
  newEffectDraft,
  type EffectDraft,
} from "../../hooks/useEffectDraft";

export function TemplatePicker({
  open,
  onOpenChange,
  dirty,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty: boolean;
  onChoose: (draft: EffectDraft, name: string) => void;
}) {
  const [pending, setPending] = useState<{
    draft: EffectDraft;
    name: string;
  } | null>(null);
  const choose = (draft: EffectDraft, name: string) => {
    if (dirty) setPending({ draft, name });
    else onChoose(draft, name);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setPending(null);
        onOpenChange(value);
      }}
    >
      <DialogContent className="workshop-studio max-h-[90dvh] overflow-y-auto p-5 sm:max-w-3xl sm:p-7">
        <DialogHeader className="text-left">
          <p className="workshop-eyebrow">The effect workshop</p>
          <DialogTitle className="text-2xl">
            {pending
              ? "Replace this draft?"
              : "Start with a little atmosphere."}
          </DialogTitle>
          <DialogDescription>
            {pending
              ? "Your unsaved source and control settings will be replaced."
              : "Choose a working effect to make your own, or start with code."}
          </DialogDescription>
        </DialogHeader>
        <div className={pending ? "hidden" : "contents"}>
          <div className="grid grid-cols-2 gap-3">
            {EFFECT_STARTERS.map((template) => (
              <button
                key={template.name}
                type="button"
                className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-amber-500/70 focus-visible:outline-2 focus-visible:outline-amber-500"
                title={template.description}
                onClick={() =>
                  choose(draftFromDefinition(template), template.name)
                }
              >
                <div
                  className="pointer-events-none relative h-28 w-full shrink-0 overflow-hidden border-b sm:h-36"
                  aria-hidden="true"
                >
                  {open && <StarterThumbnail definition={template} />}
                  <span className="absolute bottom-2 left-2 rounded bg-stone-950/80 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-200">
                    {template.kind}
                  </span>
                </div>
                <div className="w-full space-y-1 p-3">
                  <div className="flex items-center justify-between gap-1 font-medium">
                    {template.name}
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-amber-500" />
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Sparkles className="size-5 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Blank shader</p>
                <p className="text-xs text-muted-foreground">
                  Paint color, light, and motion.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => choose(newEffectDraft("shader"), "Blank shader")}
              >
                Create
              </Button>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Braces className="size-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Blank script</p>
                  <p className="text-xs text-muted-foreground">
                    Shape light with geometry.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    choose(newEffectDraft("script", "js"), "Blank JavaScript")
                  }
                >
                  <Code2 className="size-4" />
                  JavaScript
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    choose(newEffectDraft("script", "ts"), "Blank TypeScript")
                  }
                >
                  TypeScript
                </Button>
              </div>
            </div>
          </div>
        </div>
        {pending && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
          >
            <p className="flex-1 text-sm">
              Replace your unsaved draft with <strong>{pending.name}</strong>?
            </p>
            <Button
              autoFocus
              size="sm"
              variant="ghost"
              onClick={() => setPending(null)}
            >
              Keep draft
            </Button>
            <Button
              size="sm"
              className="workshop-primary"
              onClick={() => {
                onChoose(pending.draft, pending.name);
                setPending(null);
              }}
            >
              Replace draft
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
