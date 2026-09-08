import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { UploadRouter } from "../../convex/http";
import { useAuth } from "@clerk/react";
import { createElement, type ComponentProps } from "react";
import { authenticatedUploadHeaders } from "./uploadHeaders";

const CONVEX_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

const helpers = generateReactHelpers<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export function useUploadThing(
  endpoint: Parameters<typeof helpers.useUploadThing>[0],
  options?: Parameters<typeof helpers.useUploadThing>[1],
) {
  const { getToken } = useAuth();
  return helpers.useUploadThing(endpoint, {
    ...options,
    headers: authenticatedUploadHeaders(getToken, options?.headers),
  });
}

const BaseUploadButton = generateUploadButton<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

const BaseUploadDropzone = generateUploadDropzone<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export function UploadButton(props: ComponentProps<typeof BaseUploadButton>) {
  const { getToken } = useAuth();
  return createElement(BaseUploadButton, {
    ...props,
    headers: authenticatedUploadHeaders(getToken, props.headers),
  });
}

export function UploadDropzone(props: ComponentProps<typeof BaseUploadDropzone>) {
  const { getToken } = useAuth();
  return createElement(BaseUploadDropzone, {
    ...props,
    headers: authenticatedUploadHeaders(getToken, props.headers),
  });
}

export async function deleteUploadedFile(key: string): Promise<void> {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  await fetch(`${convexUrl}/api/uploadthing/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
