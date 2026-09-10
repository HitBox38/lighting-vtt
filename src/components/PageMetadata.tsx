import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPageMetadata } from "@/lib/pageMetadata";

export function PageMetadata() {
  const { pathname, search } = useLocation();
  const { title, description } = getPageMetadata(pathname, search);

  useEffect(() => {
    document.title = title;
    // Update the server-provided tag instead of adding a duplicate description.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description;
    for (const [selector, content] of [
      ['meta[property="og:title"]', title],
      ['meta[name="twitter:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:description"]', description],
    ]) {
      const tag = document.querySelector<HTMLMetaElement>(selector);
      if (tag) tag.content = content;
    }
  }, [title, description]);

  return null;
}
