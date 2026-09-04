import { Check, ClipboardCopy, Link2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ActiveInviteLinkProps {
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

export function ActiveInviteLink({
  inviteUrl,
  copied,
  onCopy,
  onRegenerate,
}: ActiveInviteLinkProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4",
        "bg-linear-to-br from-emerald-500/5 via-transparent to-transparent",
      )}>
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10">
          <Link2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <Label className="text-xs font-semibold">Invite Link</Label>
          <p className="text-[10px] text-muted-foreground">Share with players to join</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={inviteUrl}
          className="h-9 bg-background/50 font-mono text-xs focus-visible:ring-emerald-500/50"
          onFocus={(event) => event.target.select()}
          aria-label="Invite link URL"
          autoComplete="off"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={copied ? "default" : "outline"}
              className={cn(
                "size-9 shrink-0 transition-colors duration-200",
                copied && "border-emerald-500 bg-emerald-500 hover:bg-emerald-600",
              )}
              onClick={onCopy}
              aria-label={copied ? "Copied to clipboard" : "Copy link"}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <ClipboardCopy className="size-4" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{copied ? "Copied!" : "Copy Link"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={onRegenerate}
              aria-label="Regenerate invite link">
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[180px] text-center text-xs">
            Regenerate Link
            <span className="block text-muted-foreground">Invalidates previous link</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
