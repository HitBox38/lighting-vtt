import { ScriptSandbox } from "./scriptSandbox";

/**
 * One sandbox iframe per window is enough: modules are keyed by id, so the
 * scene runtime (`effectId@version`) and the editor preview (`preview:*`)
 * share it without stepping on each other. Created on first use so pages that
 * never touch script effects do not pay for the iframe.
 */
let sandbox: ScriptSandbox | null = null;

export function getScriptSandbox(): ScriptSandbox {
  if (sandbox === null) sandbox = new ScriptSandbox();
  return sandbox;
}

/** Module id under which a scene pins a script version in the sandbox. */
export function sceneModuleId(effectId: string, version: number): string {
  return `scene:${effectId}@${version}`;
}
