import { fetchWithTimeout } from "./fetchWithTimeout.ts";

const SLACK_APP_OAUTH_TOKEN = Deno.env.get("SLACK_APP_OAUTH_TOKEN");

/**
 * @description
 * Request to Slack API
 * @example
 * ```ts
 * import { requestToSlack } from "./requestToSlack.ts";
 * const chatPostMessage = await requestToSlack(
 *    "/api/chat.postMessage",
 *    "POST",
 *    {
 *      bodyObj: {
 *        channel: SLACK_CHANNEL_ID,
 *        text: commandText,
 *      },
 *    }
 *  );
 * ```
 */
export function requestToSlack(
  pathname: string,
  method: string,
  {
    bodyObj,
    searchParams,
  }: { bodyObj?: JsonObject; searchParams?: URLSearchParams }
) {
  console.log({
    function: "requestToSlack",
    pathname,
    method,
  });
  const bodyString = JSON.stringify(bodyObj);

  const headers =
    method.toUpperCase() === "GET"
      ? {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${SLACK_APP_OAUTH_TOKEN}`,
        }
      : method.toUpperCase() === "POST"
      ? {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${SLACK_APP_OAUTH_TOKEN}`,
        }
      : undefined;

  const path =
    searchParams == null ? pathname : `${pathname}?${searchParams.toString()}`;

  return fetchWithTimeout(
    `https://slack.com/${path.replace(/^\/+/, "")}`,
    {
      method,
      headers,
      body: bodyString,
    },
    1000 * 30
  ).then((res) => res.json());
}
