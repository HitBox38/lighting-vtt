"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  createUploadthing,
  createRouteHandler,
  UTApi,
} from "uploadthing/server";
import type { FileRouter } from "uploadthing/server";

// ---------------------------------------------------------------------------
// UploadThing file router (runs in Node.js runtime)
// ---------------------------------------------------------------------------

const f = createUploadthing();

const uploadRouter = {
  imageUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  }).onUploadComplete(({ file }) => {
    console.log("Upload complete:", file.url);
    return { url: file.url };
  }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

const utHandler = createRouteHandler({ router: uploadRouter });

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
  },
  returns: v.object({
    status: v.number(),
    headersEntries: v.array(v.array(v.string())),
    body: v.string(),
  }),
  handler: async (_ctx, args) => {
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
  },
  returns: v.object({
    success: v.boolean(),
    error: v.union(v.string(), v.null()),
  }),
  handler: async (_ctx, args) => {
    try {
      const utapi = new UTApi();
      await utapi.deleteFiles(args.key);
      return { success: true, error: null };
    } catch (error) {
      console.error("Failed to delete file:", error);
      return { success: false, error: String(error) };
    }
  },
});
