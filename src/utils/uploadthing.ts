import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { UploadRouter } from "../../convex/http";

const CONVEX_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

const helpers = generateReactHelpers<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export const { useUploadThing } = helpers;

export const UploadButton = generateUploadButton<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export const UploadDropzone = generateUploadDropzone<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export async function deleteUploadedFile(key: string): Promise<void> {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  await fetch(`${convexUrl}/api/uploadthing/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
