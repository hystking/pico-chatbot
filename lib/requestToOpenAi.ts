import { fetchWithTimeout } from "./fetchWithTimeout.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

/**
 * @description
 * Request to OpenAI API
 * @example
 * ```ts
 * import { requestToOpenAi } from "./requestToOpenAi.ts";
 * const aiResponse = await requestToOpenAi("/v1/chat/completions", "POST", {
 *   bodyObj: {
 *     model: "gpt-4",
 *     messages: aiMessages,
 *     temperature: 0,
 *     max_tokens: 2048,
 *     frequency_penalty: 2,
 *   },
 * });
 * ```
 */
export function requestToOpenAi(
  pathname: string,
  method: string,
  { bodyObj }: { bodyObj: JsonObject }
) {
  console.log({
    function: "requestToOpenAi",
    pathname,
    method,
  });

  const bodyString = JSON.stringify(bodyObj);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };
  return fetchWithTimeout(
    `https://api.openai.com/${pathname.replace(/^\/+/, "")}`,
    {
      method,
      headers,
      body: bodyString,
    },
    1000 * 180
  ).then((res) => res.json());
}
