import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";

import type { UploadRouter } from "../../server/uploadthing";

export const UploadButton = generateUploadButton<UploadRouter>({
  url: "/api/uploadthing",
});

export const UploadDropzone = generateUploadDropzone<UploadRouter>({
  url: "/api/uploadthing",
});
