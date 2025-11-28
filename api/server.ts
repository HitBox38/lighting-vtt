import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createRouteHandler, UTApi } from "uploadthing/server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { saveMap } from "./saveMap.js";
import { getMaps } from "./getMaps.js";
import { getSceneById } from "./getSceneById.js";
import { updateScene } from "./updateScene.js";
import { savePreset } from "./savePreset.js";
import { deletePreset } from "./deletePreset.js";
import { uploadRouter } from "./uploadthing.js";
import type { SaveMapPayload, UpdateScenePayload, LightPreset } from "../shared/index.js";

// Target the Node.js serverless runtime on Vercel and let Elysia handle parsing.
export const config = {
  runtime: "nodejs20.x",
  api: {
    bodyParser: false,
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

const buildHeadersFromNodeRequest = (req: IncomingMessage) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
    } else {
      headers.set(key, value);
    }
  }
  return headers;
};

const readRequestBody = (req: IncomingMessage): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const combined = Buffer.concat(chunks);
      resolve(new Uint8Array(combined));
    });
    req.on("error", reject);
  });

const buildRequestFromNode = async (req: IncomingMessage) => {
  const protocol = (req.headers["x-forwarded-proto"] as string) ?? "http";
  const host = req.headers.host ?? "localhost";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const headers = buildHeadersFromNodeRequest(req);
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await readRequestBody(req) : undefined;
  return new Request(url, {
    method,
    headers,
    body: body as BodyInit | null | undefined,
  });
};

const writeResponseToNode = async (res: ServerResponse, response: Response) => {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > 0) {
    res.end(Buffer.from(arrayBuffer));
  } else {
    res.end();
  }
};

const handleNodeRequest = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const webRequest = await buildRequestFromNode(req);
    const response = await app.handle(webRequest);
    await writeResponseToNode(res, response);
  } catch (error) {
    console.error("lighting-vtt API failed to handle request", error);
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end("Internal Server Error");
  }
};

const isBuntime = typeof (globalThis as Record<string, unknown>).Bun !== "undefined";
const isDirectExecution = Boolean((import.meta as { main?: boolean }).main);

if (isBuntime && isDirectExecution) {
  const port = resolvePort();
  app.listen({ port });

  const hostname = app.server?.hostname ?? "localhost";
  const listeningPort = app.server?.port ?? port;

  console.log(`lighting-vtt API listening on http://${hostname}:${listeningPort}/api`);
}

const isFetchRequest = (value: unknown): value is Request =>
  typeof Request !== "undefined" && value instanceof Request;

const fetchHandler = (request: Request) => app.handle(request);

export default async function vercelHandler(req: Request | IncomingMessage, res?: ServerResponse) {
  if (isFetchRequest(req)) {
    return fetchHandler(req);
  }

  if (!res) {
    throw new Error("Missing ServerResponse while handling Node request");
  }

  return handleNodeRequest(req, res);
}
