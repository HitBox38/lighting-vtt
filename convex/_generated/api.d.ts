/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as effects from "../effects.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_effectInstances from "../lib/effectInstances.js";
import type * as lib_thumbnailDiagnosticRunner from "../lib/thumbnailDiagnosticRunner.js";
import type * as lib_thumbnailJobs from "../lib/thumbnailJobs.js";
import type * as lib_thumbnailProcess from "../lib/thumbnailProcess.js";
import type * as lib_thumbnailRuntime from "../lib/thumbnailRuntime.js";
import type * as players from "../players.js";
import type * as scenes from "../scenes.js";
import type * as thumbnailActions from "../thumbnailActions.js";
import type * as thumbnailDiagnostics from "../thumbnailDiagnostics.js";
import type * as thumbnails from "../thumbnails.js";
import type * as uploadthingActions from "../uploadthingActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  effects: typeof effects;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/effectInstances": typeof lib_effectInstances;
  "lib/thumbnailDiagnosticRunner": typeof lib_thumbnailDiagnosticRunner;
  "lib/thumbnailJobs": typeof lib_thumbnailJobs;
  "lib/thumbnailProcess": typeof lib_thumbnailProcess;
  "lib/thumbnailRuntime": typeof lib_thumbnailRuntime;
  players: typeof players;
  scenes: typeof scenes;
  thumbnailActions: typeof thumbnailActions;
  thumbnailDiagnostics: typeof thumbnailDiagnostics;
  thumbnails: typeof thumbnails;
  uploadthingActions: typeof uploadthingActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  thumbnailWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"thumbnailWorkpool">;
};
