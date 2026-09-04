export function getClerkDisplayName(user: {
  fullName?: string | null;
  firstName?: string | null;
} | null | undefined): string {
  return user?.fullName ?? user?.firstName ?? "";
}

export function getJoinErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to join scene";
}

export function getErrorCategory(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 120) : "unknown";
}
