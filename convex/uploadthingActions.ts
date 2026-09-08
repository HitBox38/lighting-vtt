"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createRouteHandler,
  UTApi,
} from "uploadthing/server";
import { createUploadRouter } from "./lib/uploadthingRouter";
export type { UploadRouter } from "./lib/uploadthingRouter";

// ---------------------------------------------------------------------------
// Internal actions callable from HTTP actions in http.ts
// ---------------------------------------------------------------------------

/**
 * Proxy a request through the UploadThing route handler.
 *
 * We serialize the incoming Request into plain values, run the UT handler in
 * the Node.js runtime, and return the Response as plain values so http.ts can
 * reconstruct it.
 */
export const handleRequest = internalAction({
  args: {
    method: v.string(),
    url: v.string(),
    headersEntries: v.array(v.array(v.string())),
    body: v.union(v.string(), v.null()),
    ownerId: v.union(v.string(), v.null()),
  },
  returns: v.object({
    status: v.number(),
    headersEntries: v.array(v.array(v.string())),
    body: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    status: number;
    headersEntries: string[][];
    body: string;
  }> => {
    const utHandler = createRouteHandler({
      router: createUploadRouter(args.ownerId, (upload) =>
        ctx.runMutation(internal.uploads.recordCompleted, upload),
      ),
    });
    const reqHeaders = new Headers(
      args.headersEntries.map(([k, val]) => [k, val] as [string, string]),
    );

    const request = new Request(args.url, {
      method: args.method,
      headers: reqHeaders,
      body: args.method !== "GET" && args.method !== "HEAD" ? args.body : undefined,
    });

    const response = await utHandler(request);
    const responseBody = await response.text();

    const responseHeaders: Array<Array<string>> = [];
    response.headers.forEach((value, key) => {
      responseHeaders.push([key, value]);
    });

    return {
      status: response.status,
      headersEntries: responseHeaders,
      body: responseBody,
    };
  },
});

/** Delete an uploaded file by its UploadThing key. */
export const deleteFile = internalAction({
  args: {
    key: v.string(),
    ownerId: v.union(v.string(), v.null()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.union(v.string(), v.null()),
    status: v.number(),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; error: string | null; status: number }> => {
    // ownerId is supplied by the authenticated HTTP context, not its JSON body.
    if (!args.ownerId) return { success: false, error: "Sign in to delete files", status: 401 };
    if (!args.key.trim()) return { success: false, error: "Invalid key", status: 400 };
    if (!await ctx.runQuery(internal.uploads.isOwner, { key: args.key, ownerId: args.ownerId })) {
      // Legacy/untracked and other users' keys have the same response.
      return { success: false, error: "File not found", status: 404 };
    }
    try {
      const utapi = new UTApi();
      const result = await utapi.deleteFiles(args.key);
      if (!result.success) return { success: false, error: "Delete failed", status: 500 };
      return { success: true, error: null, status: 200 };
    } catch (error) {
      console.error("Failed to delete file:", error);
      return { success: false, error: "Delete failed", status: 500 };
    }
  },
});
