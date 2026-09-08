import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { deleteUploadedFile } from "../src/utils/deleteUploadedFile";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/http.ts": () => import("../convex/http"),
  "../convex/uploadthingActions.ts": () => import("../convex/uploadthingActions"),
  "../convex/uploads.ts": () => import("../convex/uploads"),
};
const key = "publicly-visible-victim-file-key";
const previousToken = process.env.UPLOADTHING_TOKEN;
function createProvider() {
  return mock(async (input: string | URL | Request, init?: RequestInit) => {
    const req = new Request(input, init);
    expect(req.url).toBe("https://api.uploadthing.com/v6/deleteFiles");
    expect(await req.json()).toEqual({ fileKeys: [key] });
    return Response.json({ success: true, deletedCount: 1 });
  });
}
let provider: ReturnType<typeof createProvider>;
let network: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;
beforeEach(() => {
  process.env.UPLOADTHING_TOKEN = Buffer.from(JSON.stringify({
    apiKey: "sk_deletion_test_only", appId: "testapp", regions: ["test"],
  })).toString("base64");
  provider = createProvider();
  // Intercept the network boundary: UTApi binds its instance methods itself.
  network = spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request, init?: RequestInit) => provider(input, init));
});
afterEach(() => {
  network.mockRestore();
  if (previousToken === undefined) delete process.env.UPLOADTHING_TOKEN;
  else process.env.UPLOADTHING_TOKEN = previousToken;
});

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.uploads.recordCompleted, { key, ownerId: "alice", url: "https://files.invalid/image.png" });
  return { t, alice: t.withIdentity({ subject: "alice" }), bob: t.withIdentity({ subject: "bob" }) };
}
function request(body: unknown = { key }) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

test("anonymous callers and another signed-in user cannot delete a visible file key", async () => {
  const { t, bob } = await setup();
  expect((await t.fetch("/api/uploadthing/delete", request())).status).toBe(401);
  expect((await bob.fetch("/api/uploadthing/delete", request())).status).toBe(404);
  expect((await bob.fetch("/api/uploadthing/delete", {
    ...request({ key, ownerId: "alice", creatorId: "alice" }),
    headers: { "Content-Type": "application/json", "x-owner-id": "alice" },
  })).status).toBe(404);
  expect(provider).not.toHaveBeenCalled();
});

test("unknown and legacy keys fail closed even with claimed ownership", async () => {
  const { alice, bob } = await setup();
  const unknown = await alice.fetch("/api/uploadthing/delete", request({ key: "legacy-key", ownerId: "alice" }));
  const notOwned = await bob.fetch("/api/uploadthing/delete", request());
  expect(unknown.status).toBe(404);
  expect(await unknown.json()).toEqual(await notOwned.json());
  expect(provider).not.toHaveBeenCalled();
});

test("malformed JSON, non-scalar keys, and empty keys never reach provider", async () => {
  const { alice } = await setup();
  for (const value of [null, [], {}, { key: null }, { key: [] }, { key: [key] }, { key: 7 }, { key: {} }, { key: "" }, { key: "  " }]) {
    expect((await alice.fetch("/api/uploadthing/delete", request(value))).status).toBe(400);
  }
  expect((await alice.fetch("/api/uploadthing/delete", { ...request(), body: "{" })).status).toBe(400);
  expect(provider).not.toHaveBeenCalled();
});

test("internal deletion action also checks identity and the ownership ledger", async () => {
  const { t } = await setup();
  expect((await t.action(internal.uploadthingActions.deleteFile, { key, ownerId: null })).status).toBe(401);
  expect((await t.action(internal.uploadthingActions.deleteFile, { key, ownerId: "bob" })).status).toBe(404);
  expect((await t.action(internal.uploadthingActions.deleteFile, { key: " ", ownerId: "alice" })).status).toBe(400);
  expect(provider).not.toHaveBeenCalled();
});

test("owner cleanup deletes exactly its file and retains immutable ownership for retries", async () => {
  const { t, alice } = await setup();
  for (let i = 0; i < 2; i++) {
    const response = await alice.fetch("/api/uploadthing/delete", request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  }
  expect(provider).toHaveBeenCalledTimes(2);
  expect((await t.run((ctx) => ctx.db.query("uploadedFiles").unique()))!.ownerId).toBe("alice");
});

test("provider rejection and exceptions remain failures and ownership remains available for retry", async () => {
  const { alice } = await setup();
  provider.mockResolvedValueOnce(Response.json({ success: false, deletedCount: 0 }));
  expect((await alice.fetch("/api/uploadthing/delete", request())).status).toBe(500);
  provider.mockRejectedValueOnce(new Error("synthetic provider failure"));
  expect((await alice.fetch("/api/uploadthing/delete", request())).status).toBe(500);
  expect((await alice.fetch("/api/uploadthing/delete", request())).status).toBe(200);
});

test("client cancellation/template cleanup uses the site host and fresh auth; failures reach caller catches", async () => {
  const { alice } = await setup();
  let calls = 0;
  let clientCalls = 0;
  network.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
    const req = new Request(input, init);
    if (req.url !== "https://test.convex.site/api/uploadthing/delete") return provider(input, init);
    clientCalls++;
    expect(req.url).toBe("https://test.convex.site/api/uploadthing/delete");
    expect(req.headers.get("Authorization")).toBe(`Bearer token-${calls}`);
    expect(await req.json()).toEqual({ key });
    return alice.fetch("/api/uploadthing/delete", init);
  });
  const getToken = async (options: { template: string }) => {
    expect(options.template).toBe("convex");
    return `token-${++calls}`;
  };
  try {
    await deleteUploadedFile(key, "https://test.convex.site", getToken);
    await deleteUploadedFile(key, "https://test.convex.site", getToken);
    expect(provider).toHaveBeenCalledTimes(2);
    provider.mockResolvedValueOnce(Response.json({ success: false, deletedCount: 0 }));
    await expect(deleteUploadedFile(key, "https://test.convex.site", getToken)).rejects.toThrow("500");
    const before = clientCalls;
    await expect(deleteUploadedFile(key, "https://test.convex.site", async () => null)).rejects.toThrow("Sign in");
    expect(clientCalls).toBe(before);
  } finally {
    network.mockRestore();
  }
});
