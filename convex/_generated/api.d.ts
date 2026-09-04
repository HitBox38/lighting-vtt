/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as iiSync from "../iiSync.js";
import type * as iiSyncMutations from "../iiSyncMutations.js";
import type * as players from "../players.js";
import type * as scenes from "../scenes.js";
import type * as tokens from "../tokens.js";
import type * as uploadthingActions from "../uploadthingActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  iiSync: typeof iiSync;
  iiSyncMutations: typeof iiSyncMutations;
  players: typeof players;
  scenes: typeof scenes;
  tokens: typeof tokens;
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

export declare const components: {};
