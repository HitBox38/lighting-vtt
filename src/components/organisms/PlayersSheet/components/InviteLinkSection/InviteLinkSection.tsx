import { useState } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";

import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ActiveInviteLink } from "@/components/organisms/PlayersSheet/components/InviteLinkSection/components/ActiveInviteLink";
import { GenerateInvitePrompt } from "@/components/organisms/PlayersSheet/components/InviteLinkSection/components/GenerateInvitePrompt";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

interface InviteLinkSectionProps {
  sceneId: Id<"scenes">;
  creatorId: string;
  existingInviteCode: string | undefined;
}

export function InviteLinkSection({
  sceneId,
  creatorId,
  existingInviteCode,
}: InviteLinkSectionProps) {
  const posthog = usePostHog();
  const createInviteCode = useMutation(api.players.createInviteCode);
  const regenerateInviteCode = useMutation(api.players.regenerateInviteCode);
  const [copied, setCopied] = useState(false);
  const inviteUrl = existingInviteCode
    ? `${window.location.origin}/join/${existingInviteCode}`
    : null;

  if (!existingInviteCode || !inviteUrl) {
    return (
      <GenerateInvitePrompt
        onGenerate={() => {
          void createInviteCode({ sceneId, creatorId });
          posthog.capture(ANALYTICS_EVENTS.PlayersInviteGenerated);
        }}
      />
    );
  }

  return (
    <ActiveInviteLink
      inviteUrl={inviteUrl}
      copied={copied}
      onCopy={() => {
        void navigator.clipboard.writeText(inviteUrl);
        posthog.capture(ANALYTICS_EVENTS.PlayersInviteLinkCopied);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      onRegenerate={() => {
        void regenerateInviteCode({ sceneId, creatorId });
        posthog.capture(ANALYTICS_EVENTS.PlayersInviteRegenerated);
      }}
    />
  );
}
