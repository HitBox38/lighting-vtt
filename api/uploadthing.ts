import { createUploadthing, type FileRouter } from "uploadthing/server";
import { createRouteHandler } from "uploadthing/server";

export const config = {
  runtime: "edge",
};

const f = createUploadthing();

// FileRouter for your app - defines the upload endpoints
export const uploadRouter = {
  // Image uploader for map images
  imageUploader: f({
    image: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Optional: Add authentication here if needed
      // For now, we allow all uploads
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log("Upload complete:", file.ufsUrl);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

export default createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
    isDev: process.env.NODE_ENV === "development",
  },
});
