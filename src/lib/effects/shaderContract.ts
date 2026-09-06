/**
 * The fixed shader contract every user-authored effect is compiled against.
 *
 * Authors only write a fragment entry point:
 *
 *   WGSL:  fn effectMain(fx: EffectInput) -> vec4<f32>
 *   GLSL:  vec4 effectMain(EffectInput fx)
 *
 * We own the vertex program, the uniform layout, blending, and premultiplied
 * alpha. Authors never touch bindings, which is what makes stranger-authored
 * shaders safe to run: they can only produce a colour for a pixel inside the
 * effect quad.
 *
 * Uniform names are chosen to never collide with pixi's own global/local
 * uniforms (`uProjectionMatrix`, `uWorldTransformMatrix`, `uWorldColorAlpha`,
 * `uResolution`, `uTransformMatrix`, `uColor`, `uRound`), because on WebGL all
 * plain uniforms of a program share one namespace.
 */
import { EFFECT_LIMITS } from "@shared/effects";

export type EffectBackend = "webgpu" | "webgl";

/** Languages the shader pipeline compiles. */
export type ShaderLanguage = "wgsl" | "glsl";

/** Every language an author can type into the editor; `js` is the Stage 3 script contract. */
export type EffectSourceLanguage = ShaderLanguage | "js";

/** Names of the per-instance uniforms in the `effectUniforms` group. */
export const EFFECT_UNIFORM_NAMES = {
  params: "uParams",
  center: "uCenter",
  mapSize: "uMapSize",
  viewport: "uViewport",
  time: "uTime",
  radius: "uRadius",
  rotation: "uRotation",
} as const;

/** Resource names on the pixi `Shader`. */
export const EFFECT_RESOURCE_NAMES = {
  uniforms: "effectUniforms",
  map: "uMap",
  mapSampler: "uMapSampler",
} as const;

export const WGSL_VERTEX_ENTRY = "mainVertex";
export const WGSL_FRAGMENT_ENTRY = "mainFragment";

const PARAM_SLOTS = EFFECT_LIMITS.maxParams;

// ---------------------------------------------------------------------------
// WGSL
// ---------------------------------------------------------------------------

/**
 * Everything before the author's code. Member order of `EffectUniforms` must
 * match the `UniformGroup` structure order in effectRegistry, because pixi
 * computes the buffer layout from the group while the GPU computes it from the
 * struct. The array goes first so no member sits behind a 16-byte array pad.
 */
const WGSL_PREAMBLE = /* wgsl */ `
struct GlobalUniforms {
  uProjectionMatrix: mat3x3<f32>,
  uWorldTransformMatrix: mat3x3<f32>,
  uWorldColorAlpha: vec4<f32>,
  uResolution: vec2<f32>,
}

struct LocalUniforms {
  uTransformMatrix: mat3x3<f32>,
  uColor: vec4<f32>,
  uRound: f32,
}

struct EffectUniforms {
  uParams: array<vec4<f32>, ${PARAM_SLOTS}>,
  uCenter: vec2<f32>,
  uMapSize: vec2<f32>,
  uViewport: vec2<f32>,
  uTime: f32,
  uRadius: f32,
  uRotation: f32,
}

@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;
@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;
@group(2) @binding(0) var<uniform> effectUniforms: EffectUniforms;
@group(2) @binding(1) var uMap: texture_2d<f32>;
@group(2) @binding(2) var uMapSampler: sampler;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) vLocal: vec2<f32>,
  @location(1) vWorld: vec2<f32>,
  @location(2) vColor: vec4<f32>,
  @location(3) vQuad: vec2<f32>,
}

/** What an author's effectMain receives. */
struct EffectInput {
  /** Position inside the effect quad, -1..1 on both axes. length() == 1 is the radius edge. */
  local: vec2<f32>,
  /** Position inside the effect quad, 0..1 on both axes (rotates with the effect). */
  quad: vec2<f32>,
  /** Map-space position in pixels. */
  world: vec2<f32>,
  /** Map texture coordinate, 0..1. */
  uv: vec2<f32>,
  /** length(local): 0 at the centre, 1 at the radius. */
  dist: f32,
  /** Seconds since the scene started rendering. */
  time: f32,
  /** Radius in map pixels. */
  radius: f32,
  /** Rotation in radians. */
  rotation: f32,
}

/** First component of the declared param at index i (numbers and booleans). */
fn effectParam(index: i32) -> f32 {
  return effectUniforms.uParams[clamp(index, 0, ${PARAM_SLOTS - 1})].x;
}

/** All four components of the declared param at index i (colours are rgba in 0..1). */
fn effectParamVec(index: i32) -> vec4<f32> {
  return effectUniforms.uParams[clamp(index, 0, ${PARAM_SLOTS - 1})];
}

/** Sample the scene map at a 0..1 texture coordinate. */
fn sampleMap(uv: vec2<f32>) -> vec4<f32> {
  return textureSample(uMap, uMapSampler, uv);
}

@vertex
fn ${WGSL_VERTEX_ENTRY}(
  @location(0) aPosition: vec2<f32>,
  @location(1) aUV: vec2<f32>,
) -> VSOutput {
  var out: VSOutput;
  let mvp = globalUniforms.uProjectionMatrix * globalUniforms.uWorldTransformMatrix * localUniforms.uTransformMatrix;
  out.position = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);

  let c = cos(effectUniforms.uRotation);
  let s = sin(effectUniforms.uRotation);
  let scaled = aPosition * effectUniforms.uRadius;
  out.vWorld = effectUniforms.uCenter + vec2<f32>(c * scaled.x - s * scaled.y, s * scaled.x + c * scaled.y);
  out.vLocal = aPosition;
  out.vQuad = aUV;
  out.vColor = localUniforms.uColor * globalUniforms.uWorldColorAlpha;
  return out;
}

// ---- author code starts on the next line ----
`;

const WGSL_POSTAMBLE = /* wgsl */ `
// ---- author code ends on the previous line ----

@fragment
fn ${WGSL_FRAGMENT_ENTRY}(in: VSOutput) -> @location(0) vec4<f32> {
  var fx: EffectInput;
  fx.local = in.vLocal;
  fx.quad = in.vQuad;
  fx.world = in.vWorld;
  fx.uv = in.vWorld / max(effectUniforms.uMapSize, vec2<f32>(1.0, 1.0));
  fx.dist = length(in.vLocal);
  fx.time = effectUniforms.uTime;
  fx.radius = effectUniforms.uRadius;
  fx.rotation = effectUniforms.uRotation;

  let color = effectMain(fx);
  let alpha = clamp(color.a, 0.0, 1.0);
  return vec4<f32>(clamp(color.rgb, vec3<f32>(0.0), vec3<f32>(1.0)) * alpha, alpha) * in.vColor;
}
`;

// ---------------------------------------------------------------------------
// GLSL (WebGL2, ES 3.00)
// ---------------------------------------------------------------------------

/** Vertex program for WebGL. Authors never see it. */
export const GLSL_VERTEX = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec2 uResolution;

uniform mat3 uTransformMatrix;
uniform vec4 uColor;
uniform float uRound;

uniform vec2 uCenter;
uniform float uRadius;
uniform float uRotation;

out vec2 vLocal;
out vec2 vWorld;
out vec4 vColor;
out vec2 vQuad;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);

  float c = cos(uRotation);
  float s = sin(uRotation);
  vec2 scaled = aPosition * uRadius;
  vWorld = uCenter + vec2(c * scaled.x - s * scaled.y, s * scaled.x + c * scaled.y);
  vLocal = aPosition;
  vQuad = aUV;
  vColor = uColor * uWorldColorAlpha;
}
`;

const GLSL_FRAGMENT_PREAMBLE = /* glsl */ `#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vWorld;
in vec4 vColor;
in vec2 vQuad;

uniform vec4 uParams[${PARAM_SLOTS}];
uniform vec2 uCenter;
uniform vec2 uMapSize;
uniform vec2 uViewport;
uniform float uTime;
uniform float uRadius;
uniform float uRotation;
uniform sampler2D uMap;

out vec4 finalColor;

/* What an author's effectMain receives. */
struct EffectInput {
  /* Position inside the effect quad, -1..1 on both axes. length() == 1 is the radius edge. */
  vec2 local;
  /* Position inside the effect quad, 0..1 on both axes (rotates with the effect). */
  vec2 quad;
  /* Map-space position in pixels. */
  vec2 world;
  /* Map texture coordinate, 0..1. */
  vec2 uv;
  /* length(local): 0 at the centre, 1 at the radius. */
  float dist;
  /* Seconds since the scene started rendering. */
  float time;
  /* Radius in map pixels. */
  float radius;
  /* Rotation in radians. */
  float rotation;
};

/* First component of the declared param at index i (numbers and booleans). */
float effectParam(int index) {
  return uParams[clamp(index, 0, ${PARAM_SLOTS - 1})].x;
}

/* All four components of the declared param at index i (colours are rgba in 0..1). */
vec4 effectParamVec(int index) {
  return uParams[clamp(index, 0, ${PARAM_SLOTS - 1})];
}

/* Sample the scene map at a 0..1 texture coordinate. */
vec4 sampleMap(vec2 uv) {
  return texture(uMap, uv);
}

// ---- author code starts on the next line ----
`;

const GLSL_FRAGMENT_POSTAMBLE = /* glsl */ `
// ---- author code ends on the previous line ----

void main() {
  EffectInput fx;
  fx.local = vLocal;
  fx.quad = vQuad;
  fx.world = vWorld;
  fx.uv = vWorld / max(uMapSize, vec2(1.0));
  fx.dist = length(vLocal);
  fx.time = uTime;
  fx.radius = uRadius;
  fx.rotation = uRotation;

  vec4 color = effectMain(fx);
  float alpha = clamp(color.a, 0.0, 1.0);
  finalColor = vec4(clamp(color.rgb, 0.0, 1.0) * alpha, alpha) * vColor;
}
`;

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface AssembledSource {
  /** Full program text handed to the compiler. */
  source: string;
  /** 1-based line in `source` where the author's first line lives. */
  authorStartLine: number;
  /** Number of author lines. */
  authorLineCount: number;
}

function countLines(text: string): number {
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

function assemble(preamble: string, author: string, postamble: string): AssembledSource {
  // Preamble ends with "\n", so the author's first line is the line after the preamble's last one.
  const authorStartLine = countLines(preamble);
  return {
    source: `${preamble}${author}\n${postamble}`,
    authorStartLine,
    authorLineCount: countLines(author),
  };
}

export function assembleWgsl(authorSource: string): AssembledSource {
  return assemble(WGSL_PREAMBLE, authorSource, WGSL_POSTAMBLE);
}

export function assembleGlslFragment(authorSource: string): AssembledSource {
  return assemble(GLSL_FRAGMENT_PREAMBLE, authorSource, GLSL_FRAGMENT_POSTAMBLE);
}

/**
 * Maps a line in the assembled program back to the author's editor. Returns
 * null when the error is inside our own wrapper (which is a bug on our side or
 * a missing `effectMain`, both reported without a line).
 */
export function toAuthorLine(assembled: AssembledSource, sourceLine: number): number | null {
  const authorLine = sourceLine - assembled.authorStartLine + 1;
  if (authorLine < 1 || authorLine > assembled.authorLineCount) return null;
  return authorLine;
}

// ---------------------------------------------------------------------------
// Author-source lint: constructs that would let author code escape the contract
// ---------------------------------------------------------------------------

export interface ForbiddenToken {
  line: number;
  token: string;
  reason: string;
}

interface Rule {
  pattern: RegExp;
  reason: string;
}

const WGSL_RULES: readonly Rule[] = [
  { pattern: /@\s*(group|binding)\b/, reason: "Bindings are provided by the runtime." },
  { pattern: /@\s*(vertex|fragment|compute)\b/, reason: "Entry points are provided by the runtime; implement effectMain instead." },
  { pattern: /\bvar\s*<\s*(uniform|storage|workgroup)\b/, reason: "Only the runtime declares uniform, storage and workgroup variables." },
  { pattern: /\b(override|enable|requires|diagnostic)\b/, reason: "Module directives are not allowed in effect code." },
  { pattern: /\b(texture_[a-z0-9_]*|sampler(_comparison)?)\s*[<;,)]/, reason: "Only the runtime declares textures and samplers; use sampleMap()." },
  { pattern: /\bstruct\s+(EffectInput|VSOutput|GlobalUniforms|LocalUniforms|EffectUniforms)\b/, reason: "This struct is reserved by the runtime." },
  { pattern: /\bfn\s+(mainVertex|mainFragment|effectParam|effectParamVec|sampleMap)\s*\(/, reason: "This function is reserved by the runtime." },
];

const GLSL_RULES: readonly Rule[] = [
  { pattern: /^\s*#\s*(version|extension|include|pragma|line)\b/, reason: "Preprocessor directives other than #define/#if are not allowed." },
  { pattern: /^\s*(layout|uniform|in|out|flat|centroid|invariant|attribute|varying)\b/, reason: "Only the runtime declares program inputs, outputs and uniforms." },
  { pattern: /\bvoid\s+main\s*\(/, reason: "main() is provided by the runtime; implement effectMain instead." },
  { pattern: /\b(gl_FragColor|gl_FragData|finalColor)\b/, reason: "Return the colour from effectMain instead of writing outputs." },
  { pattern: /\bsampler(2D|3D|Cube|2DArray|2DShadow)\b/, reason: "Only the runtime declares samplers; use sampleMap()." },
  { pattern: /\bstruct\s+EffectInput\b/, reason: "This struct is reserved by the runtime." },
  { pattern: /\b(vec4|float)\s+(effectParam|effectParamVec|sampleMap)\s*\(/, reason: "This function is reserved by the runtime." },
];

/** Removes line comments and block comments while preserving line numbers. */
function stripComments(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function hasEntryPoint(language: ShaderLanguage, stripped: string): boolean {
  switch (language) {
    case "wgsl":
      return /\bfn\s+effectMain\s*\(/.test(stripped);
    case "glsl":
      return /\bvec4\s+effectMain\s*\(/.test(stripped);
    default: {
      const exhaustive: never = language;
      throw new Error(`Unhandled shader language: ${String(exhaustive)}`);
    }
  }
}

/**
 * Cheap, deterministic pre-check that runs before touching the GPU. It is not
 * a security boundary (the compiler is), it exists so authors get a readable
 * message instead of a cryptic binding-layout error.
 */
export function lintAuthorSource(language: ShaderLanguage, source: string): ForbiddenToken[] {
  const stripped = stripComments(source);
  let rules: readonly Rule[];
  switch (language) {
    case "wgsl":
      rules = WGSL_RULES;
      break;
    case "glsl":
      rules = GLSL_RULES;
      break;
    default: {
      const exhaustive: never = language;
      throw new Error(`Unhandled shader language: ${String(exhaustive)}`);
    }
  }

  const found: ForbiddenToken[] = [];
  const lines = stripped.split("\n");
  lines.forEach((line, index) => {
    for (const rule of rules) {
      const match = rule.pattern.exec(line);
      if (match) {
        found.push({ line: index + 1, token: match[0].trim(), reason: rule.reason });
      }
    }
  });

  if (!hasEntryPoint(language, stripped)) {
    found.push({
      line: 1,
      token: "effectMain",
      reason:
        language === "wgsl"
          ? "Define `fn effectMain(fx: EffectInput) -> vec4<f32>`."
          : "Define `vec4 effectMain(EffectInput fx)`.",
    });
  }

  return found;
}

// ---------------------------------------------------------------------------
// Starter code shown in the editor for a new effect
// ---------------------------------------------------------------------------

export const STARTER_WGSL = `// A soft pulsing glow. Param 0 = colour, param 1 = speed.
fn effectMain(fx: EffectInput) -> vec4<f32> {
  let color = effectParamVec(0);
  let speed = effectParam(1);
  let pulse = 0.75 + 0.25 * sin(fx.time * speed);
  let falloff = smoothstep(1.0, 0.0, fx.dist);
  return vec4<f32>(color.rgb, color.a * falloff * pulse);
}
`;

export const STARTER_GLSL = `// A soft pulsing glow. Param 0 = colour, param 1 = speed.
vec4 effectMain(EffectInput fx) {
  vec4 color = effectParamVec(0);
  float speed = effectParam(1);
  float pulse = 0.75 + 0.25 * sin(fx.time * speed);
  float falloff = smoothstep(1.0, 0.0, fx.dist);
  return vec4(color.rgb, color.a * falloff * pulse);
}
`;
