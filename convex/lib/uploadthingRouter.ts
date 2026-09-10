"use node";

import { createUploadthing, UploadThingError, type FileRouter } from "uploadthing/server";
import type { RateLimitReturns } from "@convex-dev/rate-limiter";

type CompletedUpload = { key: string; ownerId: string; url: string };

/** Identity is supplied by the HTTP action, never by request headers or input. */
export function createUploadRouter(
  ownerId: string | null,
  recordCompleted: (upload: CompletedUpload) => Promise<unknown>,
  checkUploadLimit: (ownerId: string) => Promise<RateLimitReturns>,
) {
  const f = createUploadthing();
  return {
    imageUploader: f(
      { image: { maxFileSize: "16MB", maxFileCount: 1 } },
      { awaitServerData: true },
    )
      .middleware(async () => {
        if (!ownerId) {
          throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in to upload files" });
        }
        // Only initiation runs middleware; signed completion callbacks must finish
        // even when the uploader has since exhausted their allowance.
        const limit = await checkUploadLimit(ownerId);
        if (!limit.ok) {
          throw new UploadThingError({
            code: "FORBIDDEN",
            message: `Too many uploads. Try again in ${Math.max(1, Math.ceil(limit.retryAfter / 1000))} seconds.`,
          });
        }
        return { ownerId };
      })
      .onUploadComplete(async ({ file, metadata }) => {
        // The SDK authenticates this metadata using the callback signature.
        // Check its runtime shape as in-flight/legacy uploads may lack ownership.
        if (typeof metadata.ownerId !== "string" || !metadata.ownerId.trim()) {
          throw new UploadThingError({ code: "BAD_REQUEST", message: "Missing upload owner" });
        }
        await recordCompleted({ key: file.key, ownerId: metadata.ownerId, url: file.ufsUrl });
        return { url: file.ufsUrl };
      }),
  } satisfies FileRouter;
}

export type UploadRouter = ReturnType<typeof createUploadRouter>;
