import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

class PreviewEffectsSeeder {
  static defaultSeedPath = "convex/seed/effects-library.zip";

  static allowedUserTables = new Set([
    "effects",
    "effectVersions",
    "effectReleaseRollout",
    "uploadedFiles",
  ]);

  static requiredTables = ["effects", "effectVersions"];

  static deniedTables = new Set([
    "scenes",
    "guestPlayerSessions",
    "playerSceneBookmarks",
    "effectReports",
    "effectThumbnails",
  ]);

  static run() {
    const [command, source, destination] = process.argv.slice(2);
    if (command === "--slim") {
      if (!source) {
        throw new Error("Usage: bun scripts/seed-preview-effects.mjs --slim <source.zip> [destination.zip]");
      }
      const target = resolve(destination ?? this.defaultSeedPath);
      this.slimArchive(resolve(source), target);
      console.log(`Wrote effects-only seed archive to ${target}`);
      return;
    }

    if (process.env.CONVEX_SKIP_PREVIEW_EFFECT_SEED === "true") {
      console.log("Skipping preview effects seed because CONVEX_SKIP_PREVIEW_EFFECT_SEED=true.");
      return;
    }

    if (process.env.VERCEL_ENV !== "preview") {
      console.log("Skipping preview effects seed outside Vercel preview.");
      return;
    }

    const deployment = this.previewDeploymentRef();
    if (!this.isPreviewDeploymentRef(deployment)) {
      throw new Error(`Refusing to seed non-preview Convex deployment "${deployment}".`);
    }

    const tempRoot = mkdtempSync(join(tmpdir(), "lighting-vtt-effects-seed-"));
    try {
      const seedZip = this.resolveSeedZip(tempRoot);
      if (!seedZip) {
        console.warn(
          `No preview effects seed source found. Set CONVEX_PROD_DEPLOY_KEY or commit ${this.defaultSeedPath}.`,
        );
        return;
      }

      const slimZip = join(tempRoot, "effects-library.slim.zip");
      this.slimArchive(seedZip, slimZip);
      this.importSeed(slimZip, deployment);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  static previewDeploymentRef() {
    if (process.env.CONVEX_PREVIEW_SEED_DEPLOYMENT) {
      return process.env.CONVEX_PREVIEW_SEED_DEPLOYMENT;
    }
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    if (!branch) {
      throw new Error("VERCEL_GIT_COMMIT_REF is required to derive the Convex preview deployment.");
    }
    return `preview/${branch.replaceAll("/", "-")}`;
  }

  static isPreviewDeploymentRef(deployment) {
    return deployment.startsWith("preview/") || deployment.includes(":preview/");
  }

  static resolveSeedZip(tempRoot) {
    if (process.env.CONVEX_PROD_DEPLOY_KEY) {
      const rawZip = join(tempRoot, "effects-library.prod.zip");
      console.log("Exporting production effects snapshot for preview seed.");
      this.exec("bunx", [
        "--bun",
        "convex",
        "export",
        "--prod",
        "--include-file-storage",
        "--path",
        rawZip,
      ], {
        env: {
          ...process.env,
          CONVEX_DEPLOY_KEY: process.env.CONVEX_PROD_DEPLOY_KEY,
        },
      });
      return rawZip;
    }

    const seedPath = resolve(process.env.CONVEX_EFFECTS_SEED_ZIP ?? this.defaultSeedPath);
    return existsSync(seedPath) ? seedPath : null;
  }

  static slimArchive(sourceZip, destinationZip) {
    if (!existsSync(sourceZip)) {
      throw new Error(`Seed archive not found: ${sourceZip}`);
    }
    mkdirSync(dirname(destinationZip), { recursive: true });
    rmSync(destinationZip, { force: true });

    const tempRoot = mkdtempSync(join(tmpdir(), "lighting-vtt-effects-slim-"));
    const extractDir = join(tempRoot, "extract");
    mkdirSync(extractDir);
    try {
      this.exec("unzip", ["-q", sourceZip, "-d", extractDir]);
      this.removeDeniedEntries(extractDir);
      this.rewriteTablesManifest(extractDir);
      this.validateSlimArchive(extractDir);
      this.exec("zip", ["-qr", destinationZip, "."], { cwd: extractDir });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  static removeDeniedEntries(extractDir) {
    for (const entry of readdirSync(extractDir)) {
      const path = join(extractDir, entry);
      if (entry === "README.md" || entry === "_tables") continue;
      if (entry === "_storage") continue;
      if (this.allowedUserTables.has(entry)) continue;
      rmSync(path, { recursive: true, force: true });
    }

    for (const table of this.deniedTables) {
      const path = join(extractDir, table);
      if (existsSync(path)) {
        throw new Error(`Denied table survived seed slimming: ${table}`);
      }
    }
  }

  static rewriteTablesManifest(extractDir) {
    const manifest = join(extractDir, "_tables", "documents.jsonl");
    if (!existsSync(manifest)) return;

    const kept = readFileSync(manifest, "utf8")
      .split("\n")
      .filter(Boolean)
      .filter((line) => {
        const row = JSON.parse(line);
        return this.allowedUserTables.has(row.name);
      });
    writeFileSync(manifest, `${kept.join("\n")}${kept.length ? "\n" : ""}`);
  }

  static validateSlimArchive(extractDir) {
    for (const table of this.requiredTables) {
      const documents = join(extractDir, table, "documents.jsonl");
      if (!existsSync(documents)) {
        throw new Error(`Required seed table is missing: ${table}`);
      }
      if (statSync(documents).size === 0) {
        throw new Error(`Required seed table is empty: ${table}`);
      }
    }
  }

  static importSeed(seedZip, deployment) {
    console.log(`Importing effects seed into Convex deployment ${deployment}.`);
    this.exec("bunx", [
      "--bun",
      "convex",
      "import",
      seedZip,
      "--replace",
      "-y",
      "--deployment",
      deployment,
    ]);
  }

  static exec(command, args, options = {}) {
    execFileSync(command, args, {
      stdio: "inherit",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
    });
  }
}

PreviewEffectsSeeder.run();
