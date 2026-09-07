export type SceneRole = "remote_player" | "gm" | "player";

export interface ScenePlayerSnapshot {
  id: string;
  playerName: string;
  characterName: string;
  tokenInstanceIds: string[];
}
