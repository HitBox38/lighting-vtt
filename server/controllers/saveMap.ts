import { db } from "../../db/index.ts";
import { scenesTable } from "../../db/schema.ts";
import type { SaveMapPayload } from "../../shared/index.ts";

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
