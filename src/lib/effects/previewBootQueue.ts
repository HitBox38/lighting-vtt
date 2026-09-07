// Pixi's built-in programs are shared. A cancelled async initialization must
// finish disposing before a replacement renderer starts using those programs.
let pending: Promise<unknown> = Promise.resolve();
export function queuePreviewBoot<T>(boot: () => Promise<T>): Promise<T> {
  const result = pending.then(boot);
  pending = result.catch(() => undefined);
  return result;
}
