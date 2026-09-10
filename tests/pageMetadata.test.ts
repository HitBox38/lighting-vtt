import { expect, test } from "bun:test";
import { getPageMetadata, PAGE_METADATA } from "../src/lib/pageMetadata";

test("unknown routes receive 404 metadata instead of homepage metadata", () => {
  for (const path of ["/missing", "/effects/id/missing", "/join", "/library/missing"]) {
    expect(getPageMetadata(path)).toBe(PAGE_METADATA.notFound);
  }
});

test("returning from a missing route restores the destination metadata", () => {
  getPageMetadata("/missing");
  for (const [path, key] of [["/", "home"], ["/library", "library"], ["/effects/", "effects"], ["/privacy", "privacy"], ["/terms", "terms"], ["/effects/new", "newEffect"], ["/effects/id", "editEffect"], ["/join/code", "join"], ["/scene", "scene"]] as const) {
    expect(getPageMetadata(path)).toBe(PAGE_METADATA[key]);
  }
  expect(getPageMetadata("/scene", "?isGM=false")).toBe(PAGE_METADATA.player);
});
