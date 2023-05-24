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
