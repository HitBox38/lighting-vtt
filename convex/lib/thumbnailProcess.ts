"use node";

import { spawn } from "node:child_process";

export const RENDER_DEADLINE_MS = 60_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export class ThumbnailProcessError extends Error {
  constructor(
    readonly category: "timeout" | "process" | "output",
    message: string,
  ) {
    super(message);
    this.name = "ThumbnailProcessError";
  }
}

/** Fixed, application-owned programs only. Shader text travels through stdin. */
export function runThumbnailProcess(
  program: string,
  input: unknown,
  options: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", program], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: options.env ?? process.env,
    });
    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let failure: ThumbnailProcessError | undefined;
    const stop = (error: ThumbnailProcessError) => {
      failure ??= error;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => {
      stop(new ThumbnailProcessError("timeout", "Thumbnail subprocess exceeded its deadline"));
    }, options.timeoutMs ?? RENDER_DEADLINE_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT_BYTES) {
        stop(new ThumbnailProcessError("output", "Thumbnail subprocess exceeded its output limit"));
      } else {
        stdout += chunk.toString("utf8");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-8192);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new ThumbnailProcessError("process", error.message));
    });
    // Wait for process closure even after a deadline: don't release queue capacity
    // while native rendering is still running.
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) {
        reject(new ThumbnailProcessError("process", `Thumbnail subprocess exited (${code ?? signal}): ${stderr}`));
      } else resolve(stdout);
    });
    child.stdin.on("error", () => {
      // A child that exits before consuming input is reported by close/error.
    });
    child.stdin.end(JSON.stringify(input));
  });
}
