import { Link2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerateInvitePromptProps {
  onGenerate: () => void;
}

export function GenerateInvitePrompt({ onGenerate }: GenerateInvitePromptProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-primary/20 p-5",
        "bg-linear-to-br from-primary/5 via-transparent to-transparent",
        "space-y-3 text-center",
      )}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Link2 className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Share Your Table</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Generate an invite link so players can join this scene remotely.
        </p>
      </div>
      <Button size="sm" className="gap-2 shadow-sm" onClick={onGenerate}>
        <Sparkles className="size-3.5" aria-hidden="true" />
        Generate Invite Link
      </Button>
    </div>
  );
}
