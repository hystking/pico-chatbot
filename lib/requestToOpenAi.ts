const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export function requestToOpenAi(
  pathname: string,
  method: string,
  { bodyObj }: { bodyObj: Record<string, unknown> }
) {
  if (bodyObj != null && typeof bodyObj !== "object") {
    throw new Error("bodyObj must be an object");
  }

  const bodyString = JSON.stringify(bodyObj);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };
  return fetch(`https://api.openai.com/${pathname.replace(/^\/+/, "")}`, {
    method,
    headers,
    body: bodyString,
  }).then((res) => res.json());
}
