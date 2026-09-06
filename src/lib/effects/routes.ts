/**
 * Route builders for the effects feature. Keep every link that points at the
 * editor or the library here so a path change is a one-line edit.
 */

export const EFFECT_LIBRARY_PATH = "/effects";
export const EFFECT_EDITOR_NEW_PATH = "/effects/new";
export const EFFECT_EDITOR_ROUTE_PATTERN = "/effects/:effectId";

/** Query param that lets the editor return the user to the scene they came from. */
export const RETURN_TO_PARAM = "returnTo";

export function effectEditorPath(
  effectId: string,
  version?: number,
  returnTo?: string,
  browseFrom?: string,
): string {
  const params = new URLSearchParams();
  if (version !== undefined) params.set("version", String(version));
  if (returnTo) params.set(RETURN_TO_PARAM, returnTo);
  if (browseFrom) params.set("browseFrom", browseFrom);
  const query = params.toString();
  return `/effects/${encodeURIComponent(effectId)}${query ? `?${query}` : ""}`;
}

export function newEffectPath(returnTo?: string, browseFrom?: string): string {
  const params = new URLSearchParams();
  if (returnTo) params.set(RETURN_TO_PARAM, returnTo);
  if (browseFrom) params.set("browseFrom", browseFrom);
  return `${EFFECT_EDITOR_NEW_PATH}${params.size ? `?${params}` : ""}`;
}

export function effectLibraryPath(returnTo?: string): string {
  return returnTo
    ? `${EFFECT_LIBRARY_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`
    : EFFECT_LIBRARY_PATH;
}

/** Only same-origin paths may be used as a return target; anything else is dropped. */
export function sanitizeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    [...raw].some((character) => character.charCodeAt(0) <= 32)
  )
    return null;
  return raw;
}

/**
 * Query param the library appends to `returnTo` so the scene places the chosen
 * version once on arrival, then strips it. Value format: `<effectId>@<version>`.
 */
export const ADD_EFFECT_PARAM = "addEffect";

export interface EffectRef {
  effectId: string;
  version: number;
}

export function withAddEffect(returnTo: string, ref: EffectRef): string {
  const url = new URL(returnTo, "http://placeholder.invalid");
  url.searchParams.set(ADD_EFFECT_PARAM, `${ref.effectId}@${ref.version}`);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseAddEffectParam(raw: string | null): EffectRef | null {
  if (!raw) return null;
  const at = raw.lastIndexOf("@");
  if (at <= 0) return null;
  const effectId = raw.slice(0, at);
  const version = Number(raw.slice(at + 1));
  if (!Number.isInteger(version) || version < 1) return null;
  return { effectId, version };
}
