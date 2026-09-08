import { authenticatedUploadHeaders } from "./uploadHeaders";

export async function deleteUploadedFile(
  key: string,
  siteUrl: string,
  getToken: Parameters<typeof authenticatedUploadHeaders>[0],
): Promise<void> {
  const headers = await authenticatedUploadHeaders(getToken, { "Content-Type": "application/json" })();
  const response = await fetch(`${siteUrl}/api/uploadthing/delete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key }),
  });
  if (!response.ok) throw new Error(`Failed to delete uploaded file (${response.status})`);
}
