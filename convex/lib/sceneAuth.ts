import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUserIdOrNull } from "./auth";
import { canAuthenticatePlayer } from "./playerAuth";

/** Scene IDs and public roster IDs identify resources; they never authorize reads. */
export async function canReadScene(
  ctx: QueryCtx | MutationCtx,
  scene: Doc<"scenes">,
  proof: { playerId?: string; guestToken?: string } = {},
): Promise<boolean> {
  const userId = await getCurrentUserIdOrNull(ctx);
  if (userId !== null && (
    scene.creatorId === userId || scene.players?.some((player) => player.clerkUserId === userId)
  )) return true;
  return proof.playerId !== undefined &&
    await canAuthenticatePlayer(ctx, scene, proof.playerId, proof.guestToken);
}
