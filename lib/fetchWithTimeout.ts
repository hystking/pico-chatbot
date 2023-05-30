/**
 * @description
 * Fetch with timeout.
 * @example
 * ```ts
 * import { fetchWithTimeout } from "./fetchWithTimeout.ts";
 * const response = await fetchWithTimeout("https://example.com", {}, 1000);
 * ```
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
) {
  const abortController = new AbortController();

  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  return fetch(url, {
    ...options,
    signal: abortController.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}
