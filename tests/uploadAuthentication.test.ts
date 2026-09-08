import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { createHmac } from "node:crypto";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { authenticatedUploadHeaders } from "../src/utils/uploadHeaders";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/http.ts": () => import("../convex/http"),
  "../convex/uploadthingActions.ts": () => import("../convex/uploadthingActions"),
  "../convex/uploads.ts": () => import("../convex/uploads"),
};
// Synthetic test credential; no provider or network access is used.
const apiKey = "sk_upload_authentication_test_only";
const file = {
  name: "token.png", size: 128, type: "image/png", customId: null,
  key: "test-upload-key", url: "https://files.invalid/token.png",
  appUrl: "https://files.invalid/token.png", ufsUrl: "https://files.invalid/token.png",
  fileHash: "test-hash",
};
const uploadBody = JSON.stringify({ files: [file], input: { ownerId: "victim" }, metadata: { ownerId: "victim" } });
const previousToken = process.env.UPLOADTHING_TOKEN;
let providerCalls: Array<{ url: string; body: Record<string, unknown> }>;
let fetchSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  process.env.UPLOADTHING_TOKEN = Buffer.from(JSON.stringify({ apiKey, appId: "testapp", regions: ["test"] })).toString("base64");
  providerCalls = [];
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
    const req = new Request(input, init);
    providerCalls.push({ url: req.url, body: await req.json() as Record<string, unknown> });
    return Response.json({ ok: true });
  });
});
afterEach(() => {
  fetchSpy.mockRestore();
  if (previousToken === undefined) delete process.env.UPLOADTHING_TOKEN;
  else process.env.UPLOADTHING_TOKEN = previousToken;
});

function callback(metadata: unknown = { ownerId: "alice" }, signed = true) {
  const body = JSON.stringify({ status: "uploaded", file, metadata, origin: "https://provider.invalid" });
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "uploadthing-hook": "callback",
      ...(signed ? { "x-uploadthing-signature": "hmac-sha256=" + createHmac("sha256", apiKey).update(body).digest("hex") } : {}),
    },
    body,
  };
}

test("anonymous initiation and forged identity headers cannot obtain signed upload URLs", async () => {
  const t = convexTest(schema, modules);
  for (const headers of [{}, { "x-owner-id": "victim", Authorization: "Bearer forged" }]) {
    const response = await t.fetch("/api/uploadthing?slug=imageUploader&actionType=upload", {
      method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: uploadBody,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Sign in to upload files" });
  }
  expect(providerCalls).toHaveLength(0);
});

test("authenticated initiation uses verified HTTP identity and preserves upload limits", async () => {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice" });
  const response = await alice.fetch("/api/uploadthing?slug=imageUploader&actionType=upload", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: uploadBody,
  });
  expect(response.status).toBe(200);
  const urls = await response.json();
  expect(urls).toHaveLength(1);
  expect(urls[0].url).toContain("signature=");
  expect(providerCalls).toHaveLength(1);
  expect(providerCalls[0].body.metadata).toEqual({ ownerId: "alice" });
  expect(providerCalls[0].body.awaitServerData).toBe(true);
  expect(await t.run((ctx) => ctx.db.query("uploadedFiles").collect())).toHaveLength(0);
  const oversized = await alice.fetch("/api/uploadthing?slug=imageUploader&actionType=upload", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ ...file, size: 17 * 1024 * 1024 }], input: null }),
  });
  expect(oversized.status).toBe(400);
  expect(providerCalls).toHaveLength(1);
});

test("fake hook and unsigned or altered callbacks cannot create ownership or mint URLs", async () => {
  const t = convexTest(schema, modules);
  const unsigned = await t.fetch("/api/uploadthing?slug=imageUploader", callback({ ownerId: "victim" }, false));
  expect(unsigned.status).toBe(400);
  const tampered = callback();
  tampered.body = tampered.body.replace('"alice"', '"victim"');
  expect((await t.fetch("/api/uploadthing?slug=imageUploader", tampered)).status).toBe(400);
  const fakeHook = await t.fetch("/api/uploadthing?slug=imageUploader&actionType=upload", {
    method: "POST", headers: { "Content-Type": "application/json", "uploadthing-hook": "callback" }, body: uploadBody,
  });
  expect(await fakeHook.json()).toBeNull();
  expect(providerCalls).toHaveLength(0);
  expect(await t.run((ctx) => ctx.db.query("uploadedFiles").collect())).toHaveLength(0);
});

test("signed provider callback needs no user session and records immutable ownership before completion", async () => {
  const t = convexTest(schema, modules);
  for (let i = 0; i < 2; i++) {
    expect((await t.fetch("/api/uploadthing?slug=imageUploader", callback())).status).toBe(200);
  }
  const rows = await t.run((ctx) => ctx.db.query("uploadedFiles").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ key: file.key, ownerId: "alice", url: file.ufsUrl });
  expect(providerCalls).toHaveLength(2);
  expect(providerCalls[0].body).toEqual({ fileKey: file.key, callbackData: { url: file.ufsUrl } });
  await expect(t.mutation(internal.uploads.recordCompleted, { key: file.key, ownerId: "victim", url: file.ufsUrl })).rejects.toThrow("Upload ownership conflict");
  expect((await t.run((ctx) => ctx.db.query("uploadedFiles").unique()))!.ownerId).toBe("alice");
});

test("signed legacy or malformed metadata cannot record ownership or acknowledge completion", async () => {
  const t = convexTest(schema, modules);
  // UploadThing reports callback errors asynchronously; storage and result delivery
  // are the security assertions, not its callback HTTP acknowledgement status.
  for (const metadata of [{}, { ownerId: 42 }, { ownerId: " " }]) {
    await t.fetch("/api/uploadthing?slug=imageUploader", callback(metadata));
  }
  expect(await t.run((ctx) => ctx.db.query("uploadedFiles").collect())).toHaveLength(0);
  expect(providerCalls).toHaveLength(0);
});

test("client upload headers use fresh Convex Clerk tokens and cannot be overridden", async () => {
  let calls = 0;
  const headers = authenticatedUploadHeaders(async (options) => {
    expect(options).toEqual({ template: "convex" });
    return `session-${++calls}`;
  }, () => ({ Authorization: "Bearer forged", "x-custom": "value" }));
  expect((await headers()).get("Authorization")).toBe("Bearer session-1");
  const next = await headers();
  expect(next.get("Authorization")).toBe("Bearer session-2");
  expect(next.get("x-custom")).toBe("value");
  await expect(authenticatedUploadHeaders(async () => null)()).rejects.toThrow("Sign in");
});
