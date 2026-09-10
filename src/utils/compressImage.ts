const MIN_COMPRESSION_BYTES = 1024 * 1024;
const MAX_CANVAS_PIXELS = 32 * 1024 * 1024;

// APNG uses image/png too. Its animation control chunk must precede IDAT.
async function isStaticImage(file: File): Promise<boolean> {
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === "image/jpeg") {
    return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => signature[i] === byte)) {
    return false;
  }
  let offset = 8;
  while (offset + 12 <= file.size) {
    const header = new DataView(await file.slice(offset, offset + 8).arrayBuffer());
    const length = header.getUint32(0);
    const type = header.getUint32(4);
    if (offset + length + 12 > file.size) return false;
    if (type === 0x6163544c) return false; // acTL: animated PNG
    if (type === 0x49444154) return true; // IDAT: static image data
    if (type === 0x49454e44) return false; // IEND without image data
    offset += length + 12;
  }
  return false;
}

/** Best-effort upload optimization; retain the original unless we save at least 10%. */
export async function compressImage(file: File): Promise<File> {
  if (
    file.size < MIN_COMPRESSION_BYTES ||
    (file.type !== "image/png" && file.type !== "image/jpeg") ||
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  ) return file;

  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (!await isStaticImage(file)) return file;
    bitmap = await createImageBitmap(file);
    // Keep map coordinates and fine grid detail intact: never downscale.
    // Avoid allocating another large pixel buffer for unusually large maps.
    if (bitmap.width * bitmap.height > MAX_CANVAS_PIXELS) return file;
    canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas!.toBlob(resolve, "image/webp", 0.9);
    });
    // Browsers without WebP encoding can silently return PNG instead.
    if (!blob || blob.type !== "image/webp" || blob.size > file.size * 0.9) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } catch {
    // Unsupported/corrupt images still go through the normal upload validation.
    return file;
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}

export async function prepareImageUploads(
  files: File[],
  beforeUpload?: (files: File[]) => Promise<File[]> | File[],
): Promise<File[]> {
  const selected = await beforeUpload?.(files) ?? files;
  const prepared: File[] = [];
  // Bound peak canvas memory when used by a multi-file upload component.
  for (const file of selected) prepared.push(await compressImage(file));
  return prepared;
}
