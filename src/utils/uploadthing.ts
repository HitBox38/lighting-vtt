import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { UploadRouter } from "../../convex/http";
import { useAuth } from "@clerk/react";
import { createElement, useState, type ComponentProps } from "react";
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
) {
  const { getToken } = useAuth();
  const { isPreparing, onBeforeUploadBegin } = useImageUploadPreparation(options?.onBeforeUploadBegin);
  const upload = helpers.useUploadThing(endpoint, {
    ...options,
    onBeforeUploadBegin,
    headers: authenticatedUploadHeaders(getToken, options?.headers),
  });
  return { ...upload, isUploading: isPreparing || upload.isUploading };
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
