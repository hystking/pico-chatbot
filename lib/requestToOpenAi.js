const { request } = require("./request");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function requestToOpenAi(path, method, { bodyObj }) {
  if (bodyObj != null && typeof bodyObj !== "object") {
    throw new Error("bodyObj must be an object");
  }

  const bodyString = JSON.stringify(bodyObj);
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(bodyString),
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };
  return request(
    {
      hostname: "api.openai.com",
      path,
      method,
      headers,
    },
    bodyString
  );
}

module.exports = { requestToOpenAi };
