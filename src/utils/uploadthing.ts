import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { UploadRouter } from "../../convex/http";
import { useAuth } from "@clerk/react";
import { createElement, useRef, useState, type ComponentProps } from "react";
import { usePostHog } from "@posthog/react";
import { ANALYTICS_EVENTS, errorCategory } from "@/lib/analytics";
import { getAnalyticsContext } from "@/lib/analyticsContext";
import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { authenticatedUploadHeaders } from "./uploadHeaders";
import { deleteUploadedFile } from "./deleteUploadedFile";
import { prepareImageUploads } from "./compressImage";

const CONVEX_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

const helpers = generateReactHelpers<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

function useImageUploadPreparation(beforeUpload?: Parameters<typeof prepareImageUploads>[1]) {
  const [isPreparing, setIsPreparing] = useState(false);
  const onBeforeUploadBegin = async (files: File[]) => {
    setIsPreparing(true);
    try {
      return await prepareImageUploads(files, beforeUpload);
    } finally {
      setIsPreparing(false);
    }
  };
  return { isPreparing, onBeforeUploadBegin };
}

export function useUploadThing(
  endpoint: Parameters<typeof helpers.useUploadThing>[0],
  options?: Parameters<typeof helpers.useUploadThing>[1],
  purpose: "map" | "token" | "thumbnail" = "thumbnail",
) {
  const { getToken } = useAuth();
  const posthog = usePostHog();
  const operation = useRef<{ attempt_id: string; started: number; original_bytes: number; uploaded_bytes: number; measurable: () => boolean; context: ReturnType<typeof getAnalyticsContext> } | null>(null);
  const { isPreparing, onBeforeUploadBegin } = useImageUploadPreparation(options?.onBeforeUploadBegin);
  const finish = (error?: unknown) => {
    const current = operation.current;
    if (!current) return;
    operation.current = null;
    if (!current.measurable()) return;
    posthog.capture(error ? ANALYTICS_EVENTS.AssetUploadFailed : ANALYTICS_EVENTS.AssetUploadCompleted, {
      ...current.context, attempt_id: current.attempt_id, purpose,
      duration_ms: Date.now() - current.started,
      original_bytes: current.original_bytes, uploaded_bytes: current.uploaded_bytes,
      compression_outcome: current.uploaded_bytes === 0 ? "preparation_failed" : current.uploaded_bytes < current.original_bytes ? "compressed" : "original",
      ...(error ? { error_category: errorCategory(error) } : {}),
    });
  };
  const upload = helpers.useUploadThing(endpoint, {
    ...options,
    onBeforeUploadBegin: async (files) => {
      const current = operation.current;
      try {
        const prepared = await onBeforeUploadBegin(files);
        if (current) current.uploaded_bytes = prepared.reduce((n, f) => n + f.size, 0);
        return prepared;
      } catch (error) { finish(error); throw error; }
    },
    onClientUploadComplete: (files) => { finish(); options?.onClientUploadComplete?.(files); },
    onUploadError: (error) => { finish(error); options?.onUploadError?.(error); },
    headers: authenticatedUploadHeaders(getToken, options?.headers),
  });
  return { ...upload, startUpload: async (...args: Parameters<typeof upload.startUpload>) => {
    operation.current = { attempt_id: crypto.randomUUID(), started: Date.now(), original_bytes: args[0].reduce((n, f) => n + f.size, 0), uploaded_bytes: 0, measurable: analyticsOperationGuard(), context: getAnalyticsContext() };
    posthog.capture(ANALYTICS_EVENTS.AssetUploadStarted, { ...operation.current.context, attempt_id: operation.current.attempt_id, purpose, original_bytes: operation.current.original_bytes });
    try { return await upload.startUpload(...args); }
    catch (error) { finish(error); throw error; }
  }, isUploading: isPreparing || upload.isUploading };
}

const BaseUploadButton = generateUploadButton<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

const BaseUploadDropzone = generateUploadDropzone<UploadRouter>({
  url: `${CONVEX_URL}/api/uploadthing`,
});

export function UploadButton(props: ComponentProps<typeof BaseUploadButton>) {
  const { getToken } = useAuth();
  const { isPreparing, onBeforeUploadBegin } = useImageUploadPreparation(props.onBeforeUploadBegin);
  return createElement(BaseUploadButton, {
    ...props,
    onBeforeUploadBegin,
    disabled: props.disabled || isPreparing,
    headers: authenticatedUploadHeaders(getToken, props.headers),
  });
}

export function UploadDropzone(props: ComponentProps<typeof BaseUploadDropzone>) {
  const { getToken } = useAuth();
  const { isPreparing, onBeforeUploadBegin } = useImageUploadPreparation(props.onBeforeUploadBegin);
  return createElement(BaseUploadDropzone, {
    ...props,
    onBeforeUploadBegin,
    disabled: props.disabled || isPreparing,
    headers: authenticatedUploadHeaders(getToken, props.headers),
  });
}

export function useDeleteUploadedFile() {
  const { getToken } = useAuth();
  return (key: string) => deleteUploadedFile(key, CONVEX_URL, getToken);
}
