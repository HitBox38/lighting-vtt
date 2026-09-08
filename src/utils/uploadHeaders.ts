type TokenGetter = (options: { template: string }) => Promise<string | null>;
type UploadHeaders = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

/** Resolve on each request so uploads never reuse an expired session token. */
export function authenticatedUploadHeaders(getToken: TokenGetter, extra?: UploadHeaders) {
  return async (): Promise<Headers> => {
    const token = await getToken({ template: "convex" });
    if (!token) throw new Error("Sign in to upload files");
    const headers = new Headers(typeof extra === "function" ? await extra() : extra);
    headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };
}
