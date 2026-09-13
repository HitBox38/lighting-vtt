import { CookieSettingsDialog } from "@/components/organisms/CookieConsent/CookieConsent";
import { DmOfflineCard } from "@/pages/JoinPage/components/DmOfflineCard";
import { InvalidInviteCard } from "@/pages/JoinPage/components/InvalidInviteCard";
import { JoinLoadingState } from "@/pages/JoinPage/components/JoinLoadingState";
import { JoinSceneCard } from "@/pages/JoinPage/components/JoinSceneCard";
import { useJoinScene } from "@/pages/JoinPage/hooks/useJoinScene";

function JoinContent() {
  const join = useJoinScene();

  if (join.sceneInfo === undefined) {
    return <JoinLoadingState />;
  }
  if (join.sceneInfo === null) {
    return <InvalidInviteCard />;
  }
  if (!join.sceneInfo.dmOnline) {
    return <DmOfflineCard sceneName={join.sceneInfo.name} />;
  }

  return (
    <JoinSceneCard
      sceneName={join.sceneInfo.name}
      alreadyJoined={join.alreadyJoined}
      playerName={join.playerName}
      characterName={join.characterName}
      isJoining={join.isJoining}
      error={join.error}
      signedInLabel={join.user?.fullName ?? join.user?.primaryEmailAddress?.emailAddress}
      onPlayerNameChange={join.setPlayerNameDraft}
      onCharacterNameChange={join.setCharacterName}
      onJoin={() => void join.handleJoin()}
    />
  );
}

export function JoinPage() {
  return (
    <div className="bg-background text-foreground [&>div]:min-h-[calc(100dvh-4rem)]">
      <JoinContent />
      <footer className="flex h-16 items-center justify-center"><CookieSettingsDialog /></footer>
    </div>
  );
}
