import { db } from "../db/index.js";
import { scenesTable } from "../db/schema.js";
import type { SaveMapPayload } from "../shared/index.js";

export const saveMap = async (payload?: SaveMapPayload) => {
  if (!payload) {
    return {
      message: "No payload provided",
      payload: null,
    };
  }

  const id = crypto.randomUUID();

  await db.insert(scenesTable).values({
    id,
    creatorId: payload.creatorId,
    name: payload.name,
    mapUrl: payload.mapUrl,
    lightsState: payload.lightsState,
    mirrorsState: payload.mirrorsState,
    presets: [],
  });

  return {
    message: "Map saved successfully",
    payload: { id },
  };
};
