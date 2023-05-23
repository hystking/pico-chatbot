const SLACK_APP_OAUTH_TOKEN = Deno.env.get("SLACK_APP_OAUTH_TOKEN");

export function requestToSlack(
  pathname: string,
  method: string,
  {
    bodyObj,
    searchParams,
  }: // deno-lint-ignore ban-types
  { bodyObj?: object; searchParams?: URLSearchParams }
) {
  if (bodyObj != null && typeof bodyObj !== "object") {
    throw new Error("bodyObj must be an object");
  }
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

  return fetch(`https://slack.com/${path.replace(/^\/+/, "")}`, {
    method,
    headers,
    body: bodyString,
  }).then((res) => res.json());
}
