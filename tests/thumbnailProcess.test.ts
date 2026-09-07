import { describe, expect, test } from "bun:test";
import { runThumbnailProcess } from "../convex/lib/thumbnailProcess";

describe("thumbnail process boundary", () => {
  test("passes source as data, not executable command text", async () => {
    const input = { source: "` ${process.exit(7)} \" \n" };
    const output = await runThumbnailProcess('process.stdin.pipe(process.stdout)', input);
    expect(JSON.parse(output)).toEqual(input);
  });

  test("kills a stalled child and can run another job", async () => {
    await expect(runThumbnailProcess("while (true) {}", {}, { timeoutMs: 300 }))
      .rejects.toMatchObject({ category: "timeout" });
    expect(await runThumbnailProcess('process.stdout.write("recovered")', {})).toBe("recovered");
  });

  test("bounds output and reports failed processes", async () => {
    await expect(runThumbnailProcess('process.stdout.write("x".repeat(3 * 1024 * 1024))', {}))
      .rejects.toMatchObject({ category: "output" });
    await expect(runThumbnailProcess('process.stderr.write("fixture error"); process.exit(2)', {}))
      .rejects.toThrow("fixture error");
  });
});
