import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Load only checked-in starter code; file URLs avoid runtime data-URL length limits. */
export async function importStarterScript(source: string) {
  const directory = await mkdtemp(join(tmpdir(), "effect-starter-test-"));
  try {
    const path = join(directory, "starter.mjs");
    await writeFile(path, source);
    return await import(pathToFileURL(path).href);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
