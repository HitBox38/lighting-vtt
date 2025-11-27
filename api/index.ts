/// <reference lib="dom" />

import { saveMap } from "./controllers/saveMap.js";
import { updateScene } from "./controllers/updateScene.js";
import { savePreset } from "./controllers/savePreset.js";
import { deletePreset } from "./controllers/deletePreset.js";
import type { SaveMapPayload, UpdateScenePayload, LightPreset } from "../shared/index";
import { getMaps } from "./controllers/getMaps.js";
import { getSceneById } from "./controllers/getSceneById.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const config = {
  runtime: "edge",
};

const mergeHeaders = (...headerGroups: Array<HeadersInit | undefined>) => {
  const headers = new Headers();

  headerGroups.forEach((group) => {
    if (!group) return;

    new Headers(group).forEach((value, key) => {
      headers.set(key, value);
    });
  });

  return headers;
};

const ok = (body: BodyInit | null, init: ResponseInit = {}) =>
  new Response(body, {
    ...init,
    headers: mergeHeaders(corsHeaders, init.headers),
  });

const json = (data: unknown, init: ResponseInit = {}) =>
  ok(JSON.stringify(data), {
    ...init,
    headers: mergeHeaders({ "content-type": "application/json" }, init.headers),
  });

const isSavePath = (pathname: string) => pathname.endsWith("/save");
const isMapsPath = (pathname: string) => pathname.endsWith("/maps");
const isScenePath = (pathname: string) => pathname.includes("/scene/");
const isPresetsPath = (pathname: string) =>
  pathname.includes("/scene/") && pathname.includes("/presets");

// Parse preset path: /api/scene/{sceneId}/presets or /api/scene/{sceneId}/presets/{presetId}
const parsePresetPath = (pathname: string): { sceneId: string; presetId?: string } | null => {
  const match = pathname.match(/\/scene\/([^/]+)\/presets(?:\/([^/]+))?/);
  if (!match) return null;
  return { sceneId: match[1], presetId: match[2] };
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return ok(null, { status: 204 });
  }

  const { pathname, searchParams } = new URL(request.url);

  if (request.method === "GET") {
    if (isMapsPath(pathname)) {
      const creatorId = searchParams.get("creatorId");
      const result = await getMaps({ creatorId: creatorId ?? "" });
      return json(result);
    }
    if (isScenePath(pathname) && !isPresetsPath(pathname)) {
      const parts = pathname.split("/");
      const id = parts[parts.length - 1];
      const result = await getSceneById({ id });
      return json(result);
    }
    if (!isSavePath(pathname)) {
      return ok("lighting-vtt is running ⚔️");
    }
  }

  if (request.method === "POST" && isSavePath(pathname)) {
    const payload = await readJson<SaveMapPayload>(request);
    const result = await saveMap(payload ?? undefined);
    return json(result);
  }

  if (request.method === "PATCH" && isScenePath(pathname) && !isPresetsPath(pathname)) {
    const parts = pathname.split("/");
    const sceneId = parts[parts.length - 1];
    const payload = await readJson<Omit<UpdateScenePayload, "sceneId">>(request);
    if (!payload) {
      return json({ message: "Invalid payload", success: false }, { status: 400 });
    }
    const result = await updateScene({ ...payload, sceneId });
    return json(result);
  }

  // Preset routes: POST/PATCH to create/update, DELETE to remove
  if ((request.method === "POST" || request.method === "PATCH") && isPresetsPath(pathname)) {
    const parsed = parsePresetPath(pathname);
    if (!parsed) {
      return json({ message: "Invalid preset path", success: false }, { status: 400 });
    }
    const body = await readJson<{ creatorId: string; preset: LightPreset }>(request);
    if (!body || !body.creatorId || !body.preset) {
      return json({ message: "Invalid payload", success: false, payload: null }, { status: 400 });
    }
    const result = await savePreset({
      sceneId: parsed.sceneId,
      creatorId: body.creatorId,
      preset: body.preset,
    });
    return json(result);
  }

  if (request.method === "DELETE" && isPresetsPath(pathname)) {
    const parsed = parsePresetPath(pathname);
    if (!parsed || !parsed.presetId) {
      return json(
        { message: "Invalid preset path - presetId required", success: false },
        { status: 400 }
      );
    }
    const body = await readJson<{ creatorId: string }>(request);
    if (!body || !body.creatorId) {
      return json(
        { message: "Invalid payload - creatorId required", success: false },
        { status: 400 }
      );
    }
    const result = await deletePreset({
      sceneId: parsed.sceneId,
      creatorId: body.creatorId,
      presetId: parsed.presetId,
    });
    return json(result);
  }

  if (
    request.method !== "GET" &&
    request.method !== "POST" &&
    request.method !== "PATCH" &&
    request.method !== "DELETE"
  ) {
    return json({ message: "Method Not Allowed" }, { status: 405 });
  }

  return json({ message: "Not Found" }, { status: 404 });
}

const readJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};
