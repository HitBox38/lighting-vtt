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
  }, [title, description]);

  return null;
}
