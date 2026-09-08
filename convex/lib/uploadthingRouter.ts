"use node";

import { createUploadthing, UploadThingError, type FileRouter } from "uploadthing/server";

type CompletedUpload = { key: string; ownerId: string; url: string };

/** Identity is supplied by the HTTP action, never by request headers or input. */
export function createUploadRouter(
  ownerId: string | null,
  recordCompleted: (upload: CompletedUpload) => Promise<unknown>,
) {
  const f = createUploadthing();
  return {
    imageUploader: f(
      { image: { maxFileSize: "16MB", maxFileCount: 1 } },
      { awaitServerData: true },
    )
      .middleware(() => {
        if (!ownerId) {
          throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in to upload files" });
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
