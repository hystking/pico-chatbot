import {
  fromFileUrl,
  dirname,
  join,
} from "https://deno.land/std@0.188.0/path/mod.ts";

/**
 * @description
 * Get the path of the workspace.
 * @example
 * ```ts
 * import { workspacePath } from "./workspacePath.ts";
 * const settings = JSON.parse(
 *   await Deno.readTextFile(`${workspacePath}/state/settings.json`)
 * );
 * ```
 */
export const workspacePath = join(dirname(fromFileUrl(import.meta.url)), "..");
