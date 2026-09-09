import type { Plugin } from "vite";
import { getPageMetadata, PAGE_METADATA, type PageMetadata } from "../src/lib/pageMetadata.ts";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function withMetadata(html: string, metadata: PageMetadata): string {
  return html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, () =>
      `<meta name="description" content="${escapeHtml(metadata.description)}" />`);
}

export function pageMetadata(): Plugin {
  return {
    name: "page-metadata",
    enforce: "post",
    transformIndexHtml(html, context) {
      const url = new URL(context.originalUrl ?? "/", "http://localhost");
      return withMetadata(html, getPageMetadata(url.pathname, url.search));
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (!index || index.type !== "asset" || typeof index.source !== "string") {
          throw new Error("Missing index.html while generating public page metadata");
        }
        // Serve the public effects page's metadata even to crawlers without JS.
        this.emitFile({
          type: "asset",
          fileName: "effects/index.html",
          source: withMetadata(index.source, PAGE_METADATA.effects),
        });
      },
    },
  };
}
