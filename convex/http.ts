import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Re-export the type so the client-side UploadButton can reference it.
export type { UploadRouter } from "./uploadthingActions";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

/** Respond to OPTIONS preflight with CORS headers. */
const corsPreflightHandler = httpAction(async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

/** Merge CORS headers into an existing Response. */
function withCors(response: Response): Response {
  const patched = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    patched.headers.set(key, value);
  }
  return patched;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize a web Request into plain values that can cross the action boundary. */
async function serializeRequest(req: Request) {
  const headersEntries: Array<Array<string>> = [];
  req.headers.forEach((value, key) => {
    headersEntries.push([key, value]);
  });

  let body: string | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  return { method: req.method, url: req.url, headersEntries, body };
}

/** Reconstruct a web Response from the serialized action return value. */
function deserializeResponse(result: {
  status: number;
  headersEntries: Array<Array<string>>;
  body: string;
}): Response {
  const headers = new Headers(
    result.headersEntries.map(([k, v]) => [k, v] as [string, string]),
  );
  return new Response(result.body, { status: result.status, headers });
}

// ---------------------------------------------------------------------------
// HTTP routes
// ---------------------------------------------------------------------------

const http = httpRouter();

// ---- UploadThing: /api/uploadthing (GET + POST + OPTIONS) ----

http.route({
  path: "/api/uploadthing",
  method: "OPTIONS",
  handler: corsPreflightHandler,
});

http.route({
  path: "/api/uploadthing",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    try {
      const serialized = await serializeRequest(req);
      const identity = await ctx.auth.getUserIdentity();
      const result = await ctx.runAction(internal.uploadthingActions.handleRequest, {
        ...serialized,
        ownerId: identity?.subject ?? null,
      });
      return withCors(deserializeResponse(result));
    } catch (error) {
      console.error("UploadThing GET failed:", error);
      return withCors(
        new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
  }),
});

http.route({
  path: "/api/uploadthing",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const serialized = await serializeRequest(req);
      const identity = await ctx.auth.getUserIdentity();
      const result = await ctx.runAction(internal.uploadthingActions.handleRequest, {
        ...serialized,
        ownerId: identity?.subject ?? null,
      });
      return withCors(deserializeResponse(result));
    } catch (error) {
      console.error("UploadThing POST failed:", error);
      return withCors(
        new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
  }),
});

// ---- File deletion: /api/uploadthing/delete (POST + OPTIONS) ----

http.route({
  path: "/api/uploadthing/delete",
  method: "OPTIONS",
  handler: corsPreflightHandler,
});

http.route({
  path: "/api/uploadthing/delete",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = (await req.json()) as { key?: string };
      if (!body.key) {
        return withCors(
          new Response(JSON.stringify({ error: "Missing key" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      const result = await ctx.runAction(internal.uploadthingActions.deleteFile, {
        key: body.key,
      });

      if (!result.success) {
        return withCors(
          new Response(JSON.stringify({ error: result.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return withCors(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    } catch (error) {
      console.error("Failed to delete file:", error);
      return withCors(
        new Response(JSON.stringify({ error: "Delete failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
  }),
});

export default http;
