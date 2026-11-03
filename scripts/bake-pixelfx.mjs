// Regenerate the local PixelFX bench fixtures from one reviewed upstream snapshot.
// Run: node scripts/bake-pixelfx.mjs (after bun install --frozen-lockfile).
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { x as extract } from "tar";

const repository = "https://github.com/patch-gg/pixelfx";
const commit = "a84159688af3ca37a4be05a0d422b94451b2e24e";
// Pin the archive bytes as well as the commit before executing upstream tools.
const archiveSha256 = "ca1877ae9535621b485a9e50bd548bd9feb0d2ddabe5beeeba0ae36f662f55c6";
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = resolve(root, ".tmp/pixelfx-bake");
const output = resolve(root, "tests/fixtures/pixelfx");
const archive = join(cache, `${commit}.tar.gz`);
const selected = [
  { id: "fire/campfire", name: "Campfire" },
  { id: "arcane/portal", name: "Portal" },
  { id: "arcane/rune-circle", name: "Rune circle" },
];
const renderArgs = [
  "tools/render.mjs", ...selected.map(({ id }) => id),
  "--sheet", "--no-actor", "--bg", "none",
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

await mkdir(cache, { recursive: true });
let archiveBytes;
try {
  archiveBytes = await readFile(archive);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log(`Downloading PixelFX ${commit}…`);
  const response = await fetch(`https://codeload.github.com/patch-gg/pixelfx/tar.gz/${commit}`);
  if (!response.ok) throw new Error(`PixelFX download failed: HTTP ${response.status}`);
  archiveBytes = Buffer.from(await response.arrayBuffer());
  if (sha256(archiveBytes) !== archiveSha256) throw new Error("PixelFX archive checksum mismatch; no upstream code was executed.");
  await writeFile(archive, archiveBytes);
}
if (sha256(archiveBytes) !== archiveSha256) {
  throw new Error(`PixelFX archive checksum mismatch at ${archive}; no upstream code was executed.`);
}

// A fresh extraction prevents edits to a previous local run changing the result.
// Keep contact sheets in this ignored directory for visual inspection.
const source = await mkdtemp(join(cache, "source-"));
await extract({ file: archive, cwd: source, strip: 1, strict: true });

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: source, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`PixelFX ${args[0]} exited with status ${result.status}`);
}

// Warnings stay visible: a passing exit code is not an artistic approval.
run(["tools/check.mjs", ...selected.map(({ id }) => id)]);
run(renderArgs);

const effects = [];
for (const effect of selected) {
  const name = effect.id.split("/")[1];
  const atlas = `${effect.id}/${name}.json`;
  const image = `${effect.id}/${name}.png`;
  const atlasBytes = await readFile(join(source, "records", atlas));
  const imageBytes = await readFile(join(source, "records", image));
  await mkdir(dirname(join(output, atlas)), { recursive: true });
  await writeFile(join(output, atlas), atlasBytes);
  await writeFile(join(output, image), imageBytes);
  effects.push({ ...effect, atlas, image, sha256: { atlas: sha256(atlasBytes), image: sha256(imageBytes) } });
}
for (const name of ["LICENSE", "NOTICE.md"]) await copyFile(join(source, name), join(output, name));
await writeFile(join(output, "manifest.json"), `${JSON.stringify({ repository, commit, renderArgs, effects }, null, 2)}\n`);
console.log(`Wrote ${effects.length} pinned sheets to tests/fixtures/pixelfx.`);
console.log(`Inspect contact sheets in ${join(source, "records")} before accepting a visual change.`);
