import { Application, Graphics, Rectangle, RendererType, Sprite, Texture } from "pixi.js";
import manifest from "./fixtures/pixelfx/manifest.json";
import { frameAtTime, frameStart, parseAtlas, plateLayout, type Atlas } from "./pixelfx/atlas";

// Development-only entry: no application boot, auth, analytics, or backend imports.
function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing bench element: ${id}`);
  return value as T;
}

const effectSelect = element<HTMLSelectElement>("effect");
const scaleSelect = element<HTMLSelectElement>("scale");
const blendSelect = element<HTMLSelectElement>("blend");
const speedSelect = element<HTMLSelectElement>("speed");
const rendererSelect = element<HTMLSelectElement>("renderer");
const guidesInput = element<HTMLInputElement>("guides");
const playButton = element<HTMLButtonElement>("play");
const restartButton = element<HTMLButtonElement>("restart");
const frameInput = element<HTMLInputElement>("frame");
const frameLabel = element<HTMLOutputElement>("frame-label");
const status = element<HTMLParagraphElement>("status");
const error = element<HTMLParagraphElement>("error");
const metadata = element<HTMLParagraphElement>("metadata");
const preference = new URLSearchParams(location.search).get("renderer") === "webgpu" ? "webgpu" : "webgl";
rendererSelect.value = preference;
// A recursive glob is required: a single interpolated URL only matches one level.
// These imports resolve URLs; images are still fetched/decoded on selection.
const fixtureUrls = import.meta.glob<string>("./fixtures/pixelfx/**/*", {
  eager: true, query: "?url", import: "default",
});
element<HTMLAnchorElement>("license").href = fixtureUrl("LICENSE");
element<HTMLAnchorElement>("notices").href = fixtureUrl("NOTICE.md");

interface LoadedSheet {
  atlas: Atlas;
  base: Texture;
  textures: Texture[];
  loadMs: number;
}
interface Plate {
  app: Application;
  background: Graphics;
  sprite: Sprite;
  guides: Graphics;
  light: boolean;
}

const plates: Plate[] = [];
const sheets = new Map<string, Promise<LoadedSheet>>();
const loadedSheets = new Set<LoadedSheet>();
const events = new AbortController();
const { signal } = events;
let current: LoadedSheet | null = null;
let elapsedMs = 0;
let previousTime = 0;
let animationFrame = 0;
let lastFrame = -1;
let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
let request = 0;
let disposed = false;

function showError(reason: unknown) {
  error.hidden = false;
  error.textContent = reason instanceof Error ? reason.message : String(reason);
  status.textContent = "Could not prepare this animation. Try another selection or renderer.";
}

function fixtureUrl(path: string) {
  const url = fixtureUrls[`./fixtures/pixelfx/${path}`];
  if (!url) throw new Error(`Unknown fixture: ${path}`);
  return url;
}

async function decodeSheet(item: (typeof manifest.effects)[number]): Promise<LoadedSheet> {
  const start = performance.now();
  const image = new Image();
  image.src = fixtureUrl(item.image);
  const [raw] = await Promise.all([
    fetch(fixtureUrl(item.atlas), { signal }).then((response) => {
      if (!response.ok) throw new Error(`Atlas request failed (${response.status})`);
      return response.json() as Promise<unknown>;
    }),
    image.decode(),
  ]);
  const atlas = parseAtlas(raw);
  if (image.naturalWidth !== atlas.meta.size.w || image.naturalHeight !== atlas.meta.size.h) {
    throw new Error("Decoded image dimensions do not match the atlas metadata");
  }
  if (disposed) throw new Error("Bench was disposed during asset loading");
  const base = Texture.from(image);
  base.source.scaleMode = "nearest";
  base.source.autoGenerateMipmaps = false;
  const textures = atlas.frames.map(({ frame }) => new Texture({
    source: base.source,
    frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
  }));
  const loaded = { atlas, base, textures, loadMs: performance.now() - start };
  loadedSheets.add(loaded);
  return loaded;
}

function loadSheet(item: (typeof manifest.effects)[number]): Promise<LoadedSheet> {
  let pending = sheets.get(item.id);
  if (!pending) {
    pending = decodeSheet(item).catch((reason: unknown) => {
      sheets.delete(item.id);
      throw reason;
    });
    sheets.set(item.id, pending);
  }
  return pending;
}

function drawBackground(plate: Plate, width: number, height: number) {
  const { background, light } = plate;
  background.clear().rect(0, 0, width, height).fill(light ? 0xe6dec7 : 0x1b2427);
  const cell = 40;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      // Fixed colors, independent of the animation: expose alpha on textured ground.
      const variation = ((x / cell) * 7 + (y / cell) * 3) % 5;
      background.rect(x + 1, y + 1, cell - 2, cell - 2)
        .fill({ color: light ? 0xc1b38d : 0x59635d, alpha: 0.035 + variation * 0.018 });
    }
  }
  for (let x = 0; x < width; x += cell) background.moveTo(x + 0.5, 0).lineTo(x + 0.5, height);
  for (let y = 0; y < height; y += cell) background.moveTo(0, y + 0.5).lineTo(width, y + 0.5);
  background.stroke({ color: light ? 0x8c8166 : 0x92a292, width: 1, alpha: 0.15 });
}

function layout() {
  if (!current) return;
  const { atlas } = current;
  const scale = Number(scaleSelect.value);
  const { width, height, x, y } = plateLayout(atlas, scale);
  for (const plate of plates) {
    plate.app.renderer.resize(width, height);
    drawBackground(plate, width, height);
    plate.sprite.position.set(x, y);
    plate.sprite.scale.set(scale);
    plate.sprite.anchor.set(atlas.pivot[0] / atlas.frameWidth, atlas.pivot[1] / atlas.frameHeight);
    plate.sprite.blendMode = blendSelect.value === "add" ? "add" : "normal";
    plate.guides.clear();
    if (guidesInput.checked) {
      const left = x - atlas.pivot[0] * scale, top = y - atlas.pivot[1] * scale;
      plate.guides.rect(left, top, atlas.frameWidth * scale, atlas.frameHeight * scale)
        .stroke({ color: plate.light ? 0x554a2c : 0x91a194, width: 1, alpha: 0.65 });
      plate.guides.moveTo(x - 7, y).lineTo(x + 7, y).moveTo(x, y - 7).lineTo(x, y + 7)
        .stroke({ color: plate.light ? 0x9a430a : 0xffb65f, width: 1 });
    }
  }
  renderFrame(true);
}

function renderFrame(force = false) {
  if (!current) return;
  const index = frameAtTime(current.atlas, elapsedMs);
  if (!force && index === lastFrame) return;
  lastFrame = index;
  for (const plate of plates) {
    plate.sprite.texture = current.textures[index];
    plate.app.render();
  }
  frameInput.value = String(index);
  frameInput.setAttribute("aria-valuetext", `Frame ${index + 1} of ${current.textures.length}`);
  frameLabel.value = `${index + 1} / ${current.textures.length}`;
}

function tick(now: number) {
  animationFrame = 0;
  if (disposed || !playing || !current) return;
  elapsedMs += (now - previousTime) * Number(speedSelect.value);
  previousTime = now;
  if (current.atlas.meta.pixelfx.loop) elapsedMs %= current.atlas.durationMs;
  renderFrame();
  animationFrame = requestAnimationFrame(tick);
}

function updatePlayback() {
  cancelAnimationFrame(animationFrame);
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.setAttribute("aria-pressed", String(!playing));
  previousTime = performance.now();
  if (playing && current && !disposed) animationFrame = requestAnimationFrame(tick);
}

async function selectEffect() {
  const selection = ++request;
  const item = manifest.effects.find(({ id }) => id === effectSelect.value);
  if (!item) return;
  error.hidden = true;
  status.textContent = `Loading ${item.name}…`;
  current = null;
  updatePlayback();
  playButton.disabled = restartButton.disabled = frameInput.disabled = true;
  for (const plate of plates) { plate.sprite.visible = false; plate.app.render(); }
  try {
    const loaded = await loadSheet(item);
    if (selection !== request || disposed) return;
    current = loaded;
    elapsedMs = 0;
    lastFrame = -1;
    frameInput.max = String(loaded.atlas.frames.length - 1);
    playButton.disabled = restartButton.disabled = frameInput.disabled = false;
    for (const plate of plates) plate.sprite.visible = true;
    const { atlas } = loaded;
    const memory = atlas.meta.size.w * atlas.meta.size.h * 4 / 1024 / 1024;
    metadata.textContent = `${atlas.frameWidth} × ${atlas.frameHeight} px per frame · Pivot ${atlas.pivot.join(", ")} · ${atlas.frames.length} frames · ${(atlas.durationMs / 1000).toFixed(3)} s loop · Atlas ${atlas.meta.size.w} × ${atlas.meta.size.h} · ${memory.toFixed(2)} MiB RGBA8 per renderer (two canvases)`;
    status.textContent = `${item.name} ready · ${loaded.loadMs.toFixed(0)} ms fetch + decode on first selection · ${preference.toUpperCase()} · Shared frames and clock`;
    layout();
    updatePlayback();
  } catch (reason) {
    if (selection === request && !disposed) showError(reason);
  }
}

function dispose() {
  if (disposed) return;
  disposed = true;
  events.abort();
  cancelAnimationFrame(animationFrame);
  for (const plate of plates) plate.app.destroy(true, { children: true, texture: false, textureSource: false });
  for (const sheet of loadedSheets) {
    for (const texture of sheet.textures) texture.destroy(false);
    sheet.base.destroy(true);
  }
  sheets.clear();
  loadedSheets.clear();
}

effectSelect.addEventListener("change", () => { void selectEffect(); }, { signal });
for (const control of [scaleSelect, blendSelect, guidesInput]) control.addEventListener("change", layout, { signal });
speedSelect.addEventListener("change", updatePlayback, { signal });
playButton.addEventListener("click", () => { playing = !playing; updatePlayback(); }, { signal });
restartButton.addEventListener("click", () => { elapsedMs = 0; renderFrame(true); updatePlayback(); }, { signal });
frameInput.addEventListener("input", () => {
  if (!current) return;
  playing = false;
  elapsedMs = frameStart(current.atlas, Number(frameInput.value));
  updatePlayback();
  renderFrame(true);
}, { signal });
// Keep renderer recovery available even if initialization disposes the bench.
rendererSelect.onchange = () => {
  const url = new URL(location.href);
  url.searchParams.set("renderer", rendererSelect.value);
  location.assign(url.href);
};
window.addEventListener("pagehide", (event) => {
  if (event.persisted) cancelAnimationFrame(animationFrame);
  else dispose();
}, { signal });
window.addEventListener("pageshow", (event) => { if (event.persisted) updatePlayback(); }, { signal });
import.meta.hot?.dispose(dispose);

try {
  for (const [id, light] of [["dark", false], ["light", true]] as const) {
    const app = new Application();
    // Initialize sequentially so a failed second context can clean up the first.
    try {
      await app.init({ width: 440, height: 280, resolution: 1, preference, antialias: false, autoStart: false, roundPixels: true });
    } catch (reason) {
      throw new Error(`Could not initialize ${preference.toUpperCase()}: ${reason instanceof Error ? reason.message : String(reason)}`, { cause: reason });
    }
    if (disposed) { app.destroy(true, { children: true }); break; }
    const requestedType = preference === "webgpu" ? RendererType.WEBGPU : RendererType.WEBGL;
    if (app.renderer.type !== requestedType) {
      app.destroy(true, { children: true });
      throw new Error(`${preference.toUpperCase()} is unavailable here. Choose another renderer to inspect the sheets.`);
    }
    const background = new Graphics(), sprite = new Sprite(), guides = new Graphics();
    app.stage.eventMode = "none";
    app.stage.addChild(background, sprite, guides);
    app.canvas.setAttribute("aria-label", `${light ? "Light parchment" : "Dark stone"} animation preview`);
    element<HTMLDivElement>(id).appendChild(app.canvas);
    plates.push({ app, background, sprite, guides, light });
  }
  if (!disposed) {
    for (const item of manifest.effects) effectSelect.add(new Option(item.name, item.id));
    effectSelect.disabled = false;
    element<HTMLParagraphElement>("provenance").textContent = `Source: ${manifest.repository} @ ${manifest.commit.slice(0, 12)} · Generated fixtures / no PixelFX runtime`;
    await selectEffect();
  }
} catch (reason) {
  showError(reason);
  dispose();
}
