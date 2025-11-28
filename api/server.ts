import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createRouteHandler, UTApi } from "uploadthing/server";
import { saveMap } from "./controllers/saveMap.js";
import { getMaps } from "./controllers/getMaps.js";
import { getSceneById } from "./controllers/getSceneById.js";
import { updateScene } from "./controllers/updateScene.js";
import { savePreset } from "./controllers/savePreset.js";
import { deletePreset } from "./controllers/deletePreset.js";
import { uploadRouter } from "./uploadthing.js";
import type { SaveMapPayload, UpdateScenePayload, LightPreset } from "../shared/index.js";

// Vercel Serverless Function configuration (Node.js)
export const config = {
  api: {
    bodyParser: false, // Disable Vercel's body parser so Elysia can handle it
  },
};

// Create UploadThing route handler
const uploadthingHandler = createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
  },
});

const utapi = new UTApi();

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .get("/", () => "lighting-vtt is running ⚔️")
  .get("/maps", ({ query }) => getMaps({ creatorId: query.creatorId as string }))
  .get("/scene/:id", ({ params }) => getSceneById({ id: params.id }))
  .patch("/scene/:id", ({ params, body }) =>
    updateScene({ ...(body as Omit<UpdateScenePayload, "sceneId">), sceneId: params.id })
  )
  .post("/save", ({ body }) => saveMap(body as SaveMapPayload))
  // Preset routes
  .post("/scene/:id/presets", ({ params, body }) => {
    const { creatorId, preset } = body as { creatorId: string; preset: LightPreset };
    return savePreset({ sceneId: params.id, creatorId, preset });
  })
  .patch("/scene/:id/presets", ({ params, body }) => {
    const { creatorId, preset } = body as { creatorId: string; preset: LightPreset };
    return savePreset({ sceneId: params.id, creatorId, preset });
  })
  .delete("/scene/:id/presets/:presetId", ({ params, body }) => {
    const { creatorId } = body as { creatorId: string };
    return deletePreset({ sceneId: params.id, creatorId, presetId: params.presetId });
  })
  .get("/uploadthing", (ctx) => uploadthingHandler(ctx.request))
  .post("/uploadthing", (ctx) => {
    console.log("uploadthing", ctx.request);
    console.log("uploadthing token", process.env.UPLOADTHING_TOKEN);

    return uploadthingHandler(ctx.request);
  })
  .post("/uploadthing/delete", async ({ body, set }) => {
    const { key } = (body ?? {}) as { key?: string };
    if (!key) {
      set.status = 400;
      return { message: "Missing file key" };
    }
    try {
      await utapi.deleteFiles(key);
      return { message: "File deleted" };
    } catch (error) {
      console.error("Failed to delete UploadThing file", error);
      set.status = 500;
      return { message: "Failed to delete file" };
    }
  });

const resolvePort = () => {
  const envPort = Number(process.env.PORT);
  if (!Number.isNaN(envPort) && envPort > 0) {
    return envPort;
  }

  const flagIndex = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");

  if (flagIndex !== -1) {
    const value = Number(process.argv[flagIndex + 1]);
    if (!Number.isNaN(value) && value > 0) {
      return value;
    }
  }

  return 3001;
};

if (import.meta.main) {
  const port = resolvePort();
  app.listen({ port });

  const hostname = app.server?.hostname ?? "localhost";
  const listeningPort = app.server?.port ?? port;

  console.log(`lighting-vtt API listening on http://${hostname}:${listeningPort}/api`);
}

export default app.handle;
