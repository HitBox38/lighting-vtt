import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { compressImage, prepareImageUploads } from "../src/utils/compressImage";

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalBitmap = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
const largeSize = 2 * 1024 * 1024;
let encoded: Blob | null;
let bitmap: { width: number; height: number; close: ReturnType<typeof mock> };
let canvas: { width: number; height: number; getContext: ReturnType<typeof mock>; toBlob: ReturnType<typeof mock> };
let decode: ReturnType<typeof mock>;

function jpeg(size = largeSize) {
  return new File([new Uint8Array([0xff, 0xd8, 0xff]), new Uint8Array(size - 3)], "map.original.jpg", {
    type: "image/jpeg", lastModified: 1234,
  });
}

function png(animated: boolean) {
  const chunk = new Uint8Array(12);
  new DataView(chunk.buffer).setUint32(4, animated ? 0x6163544c : 0x49444154);
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk, new Uint8Array(largeSize)], "token.png", { type: "image/png" });
}

beforeEach(() => {
  encoded = new Blob([new Uint8Array(1000)], { type: "image/webp" });
  bitmap = { width: 4096, height: 2048, close: mock() };
  canvas = {
    width: 0, height: 0,
    getContext: mock(() => ({ drawImage: mock() })),
    toBlob: mock((callback: BlobCallback) => {
      expect([canvas.width, canvas.height]).toEqual([bitmap.width, bitmap.height]);
      callback(encoded);
    }),
  };
  decode = mock(async () => bitmap);
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: decode });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
});

afterEach(() => {
  for (const [name, descriptor] of [["document", originalDocument], ["createImageBitmap", originalBitmap]] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test("small files and already-compressed, animated, vector, or unknown formats bypass decoding", async () => {
  const files = [jpeg(1024), ...["image/webp", "image/gif", "image/avif", "image/svg+xml", "application/pdf"].map(
    (type) => new File([new Uint8Array(largeSize)], "asset", { type }),
  ), png(true)];
  for (const file of files) expect(await compressImage(file)).toBe(file);
  expect(decode).not.toHaveBeenCalled();
});

test("large JPEG and static PNG become WebP without changing dimensions", async () => {
  for (const file of [jpeg(), png(false)]) {
    const result = await compressImage(file);
    expect(result).not.toBe(file);
    expect(result.name).toBe(file.name.replace(/\.[^.]+$/, ".webp"));
    expect(result.type).toBe("image/webp");
    expect(result.lastModified).toBe(file.lastModified);
    expect(result.size).toBe(1000);
  }
  expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.9);
  expect(bitmap.close).toHaveBeenCalledTimes(2);
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});

test("original survives when encoding is larger, savings are trivial, or encoding is unsupported", async () => {
  const file = jpeg();
  for (const result of [null, new Blob(["fallback"], { type: "image/png" }),
    new Blob([new Uint8Array(largeSize + 1)], { type: "image/webp" }),
    new Blob([new Uint8Array(largeSize * 0.95)], { type: "image/webp" })]) {
    encoded = result;
    expect(await compressImage(file)).toBe(file);
  }
  expect(bitmap.close).toHaveBeenCalledTimes(4);
});

test("decoder and encoder failures preserve the upload and release allocated resources", async () => {
  const file = jpeg();
  decode.mockRejectedValueOnce(new Error("decode failed"));
  expect(await compressImage(file)).toBe(file);
  canvas.toBlob.mockImplementationOnce(() => { throw new Error("encode failed"); });
  expect(await compressImage(file)).toBe(file);
  expect(bitmap.close).toHaveBeenCalledTimes(1);
  expect(canvas.width).toBe(0);
});

test("excessively large dimensions bypass canvas encoding instead of downscaling", async () => {
  bitmap.width = bitmap.height = 8192;
  const file = jpeg();
  expect(await compressImage(file)).toBe(file);
  expect(canvas.getContext).not.toHaveBeenCalled();
  expect(bitmap.close).toHaveBeenCalledTimes(1);
});

test("malformed or mislabeled PNG files are not flattened", async () => {
  const file = new File([new Uint8Array(largeSize)], "animation.png", { type: "image/png" });
  expect(await compressImage(file)).toBe(file);
  expect(decode).not.toHaveBeenCalled();
});

test("existing before-upload callbacks run first and their selection/order is preserved", async () => {
  const input = [jpeg()];
  const replacement = png(false);
  const small = jpeg(500);
  const callback = mock(async (files: File[]) => {
    expect(files).toBe(input);
    return [small, replacement];
  });
  const result = await prepareImageUploads(input, callback);
  expect(result[0]).toBe(small);
  expect(result[1].name).toBe("token.webp");
  expect(decode).toHaveBeenCalledTimes(1);
});
