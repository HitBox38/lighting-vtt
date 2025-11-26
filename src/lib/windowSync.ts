import type { Light } from "@/types/light";
import type { Mirror } from "@/types/mirror";

const CHANNEL_NAME = "lighting-vtt-sync";

export interface SyncState {
  lights: Light[];
  mirrors: Mirror[];
  activePresetId: string | null;
}

export interface SyncMessage {
  type: "state-update" | "request-state" | "state-response";
  state?: SyncState;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/**
 * Broadcast state changes to other windows (GM only)
 */
export function broadcastState(state: SyncState): void {
  const message: SyncMessage = {
    type: "state-update",
    state,
  };
  getChannel().postMessage(message);
}

/**
 * Subscribe to state updates from GM window (player windows only)
 */
export function subscribeToStateUpdates(callback: (state: SyncState) => void): () => void {
  const ch = getChannel();

  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data.type === "state-update" || event.data.type === "state-response") {
      if (event.data.state) {
        callback(event.data.state);
      }
    }
  };

  ch.addEventListener("message", handleMessage);

  return () => {
    ch.removeEventListener("message", handleMessage);
  };
}

/**
 * Request current state from GM window (player windows only)
 */
export function requestState(): void {
  const message: SyncMessage = {
    type: "request-state",
  };
  getChannel().postMessage(message);
}

/**
 * Subscribe to state requests and respond with current state (GM only)
 */
export function subscribeToStateRequests(getCurrentState: () => SyncState): () => void {
  const ch = getChannel();

  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data.type === "request-state") {
      const currentState = getCurrentState();
      const response: SyncMessage = {
        type: "state-response",
        state: currentState,
      };
      ch.postMessage(response);
    }
  };

  ch.addEventListener("message", handleMessage);

  return () => {
    ch.removeEventListener("message", handleMessage);
  };
}
