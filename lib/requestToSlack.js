const { request } = require("./request");

const SLACK_APP_OAUTH_TOKEN = process.env.SLACK_APP_OAUTH_TOKEN;

async function requestToSlack(path, method, { bodyObj, searchParams }) {
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
          "Content-Length": Buffer.byteLength(bodyString),
          Authorization: `Bearer ${SLACK_APP_OAUTH_TOKEN}`,
        }
      : null;

  const options = {
    hostname: "slack.com",
    path: searchParams == null ? path : `${path}?${searchParams.toString()}`,
    method,
    headers,
  };

  return request(options, bodyString);
}

module.exports = { requestToSlack };
