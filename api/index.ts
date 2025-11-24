/// <reference lib="dom" />

import { saveMap, type SaveMapPayload } from "./controllers/saveMap.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return ok(null, { status: 204 });
  }

  const { pathname } = new URL(request.url);

  if (request.method === "GET" && !isSavePath(pathname)) {
    return ok("lighting-vtt is running ⚔️");
  }

  if (request.method === "POST" && isSavePath(pathname)) {
    const payload = await readJson(request);
    const result = await saveMap(payload);
    return json(result);
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ message: "Method Not Allowed" }, { status: 405 });
  }

  return json({ message: "Not Found" }, { status: 404 });
}

const readJson = async (request: Request): Promise<SaveMapPayload> => {
  try {
    return (await request.json()) as SaveMapPayload;
  } catch {
    return null;
  }
};
