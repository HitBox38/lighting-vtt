import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";

import type { UploadRouter } from "../../convex/http";

const CONVEX_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

export const UploadButton = generateUploadButton<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export const UploadDropzone = generateUploadDropzone<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});
