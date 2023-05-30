/**
 * @description
 * Sleep for a specified amount of time.
 * @example
 * ```ts
 * import { sleep } from "./sleep.ts";
 * await sleep(1000);
 * ```
 */
export function sleep(ms: number) {
  console.log("Sleeping for", ms, "ms");
  return new Promise((resolve) => setTimeout(resolve, ms));
}
