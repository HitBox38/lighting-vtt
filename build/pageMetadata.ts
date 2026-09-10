import { loadEnv, type Plugin } from "vite";
import { getPageMetadata, PAGE_METADATA, type PageMetadata } from "../src/lib/pageMetadata.ts";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function withMetadata(html: string, metadata: PageMetadata, imageUrl: string): string {
  const socialTags = [
    ["property", "og:type", "website"],
    ["property", "og:site_name", "Lighting VTT"],
    ["property", "og:title", metadata.title],
    ["property", "og:description", metadata.description],
    ["property", "og:image", imageUrl],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "630"],
    ["property", "og:image:alt", "Lighting VTT — Bring your battlemap to life. Dynamic lighting and custom effects for your TV table, with the amber Lightling flame mascot."],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", metadata.title],
    ["name", "twitter:description", metadata.description],
    ["name", "twitter:image", imageUrl],
    ["name", "twitter:image:alt", "Lighting VTT — Bring your battlemap to life. Dynamic lighting and custom effects for your TV table, with the amber Lightling flame mascot."],
  ].map(([attribute, key, value]) =>
    `    <meta ${attribute}="${key}" content="${escapeHtml(value)}" />`).join("\n");

  return html
    // Public pages are derived from the homepage HTML; replace its social tags.
    .replace(/\s*<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>/g, "")
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, () =>
      `<meta name="description" content="${escapeHtml(metadata.description)}" />`)
    .replace("</head>", `${socialTags}\n  </head>`);
}

export function pageMetadata(): Plugin {
  let imageUrl: string;
  return {
    name: "page-metadata",
    enforce: "post",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, "");
      // Vercel supplies the production domain on preview builds as well.
      const host = env.VITE_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
      const origin = host
        ? new URL(host.includes("://") ? host : `https://${host}`).origin
        : `http://localhost:${config.server.port ?? 5173}`;
      if (config.command === "build" && !host) {
        config.logger.warn("Social preview URLs use localhost. Set VITE_SITE_URL for deployments outside Vercel.");
      }
      imageUrl = new URL("/social-preview.png", origin).href;
    },
    transformIndexHtml(html, context) {
      const url = new URL(context.originalUrl ?? "/", "http://localhost");
      return withMetadata(html, getPageMetadata(url.pathname, url.search), imageUrl);
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (!index || index.type !== "asset" || typeof index.source !== "string") {
          throw new Error("Missing index.html while generating public page metadata");
        }
        // Serve public page metadata even to crawlers without JavaScript.
        for (const page of ["effects", "privacy", "terms"] as const) {
          this.emitFile({
            type: "asset",
            fileName: `${page}/index.html`,
            source: withMetadata(index.source, PAGE_METADATA[page], imageUrl),
          });
        }
      },
    },
  };
}
