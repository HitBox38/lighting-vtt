import { readFile } from "node:fs/promises";
import { expect, test } from "bun:test";

const siteOrigin = "https://lighting-vtt.xyz";

function getSitemapPaths(sitemap: string): string[] {
  return Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), ([, loc]) => new URL(loc, siteOrigin).pathname);
}

function getDisallowedPaths(robots: string): string[] {
  return robots
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Disallow:"))
    .map((line) => line.slice("Disallow:".length).trim())
    .filter((path) => path !== "");
}

function pathMatchesDisallow(pathname: string, disallow: string): boolean {
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const normalizedDisallow = disallow.endsWith("/") ? disallow : `${disallow}/`;

  return normalizedPath.startsWith(normalizedDisallow);
}

test("sitemap does not list robots-disallowed app-private routes", async () => {
  const [sitemap, robots] = await Promise.all([
    readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
    readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  ]);

  const sitemapPaths = getSitemapPaths(sitemap);
  const disallowedPaths = getDisallowedPaths(robots);

  const contradictions = sitemapPaths.filter((path) =>
    disallowedPaths.some((disallow) => pathMatchesDisallow(path, disallow)),
  );

  expect(contradictions).toEqual([]);
});
