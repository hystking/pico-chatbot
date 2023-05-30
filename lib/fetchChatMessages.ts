import { requestToSlack } from "./requestToSlack.ts";
import { getPrettyJapanDatetimeString } from "./getPrettyJapanDatetimeString.ts";
import { tryToGetValueFromJson } from "./tryToGetValueFromJson.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");

export async function fetchChatMessages() {
  if (SLACK_CHANNEL_ID == null) {
    throw new Error("SLACK_CHANNEL_ID is not set");
  }

  const conversationsHistory = await requestToSlack(
    "/api/conversations.history",
    "POST",
    {
      bodyObj: {
        channel: SLACK_CHANNEL_ID,
        limit: 10,
      },
    }
  );

  if (!tryToGetValueFromJson(conversationsHistory, "ok")) {
    throw new Error(
      `conversationsHistory.ok is false: ${tryToGetValueFromJson(
        conversationsHistory,
        "error"
      )?.toString()}`
    );
  }

  const conversationsHistoryMessages = tryToGetValueFromJson(
    conversationsHistory,
    "messages"
  );

  if (!Array.isArray(conversationsHistoryMessages)) {
    throw new Error(
      `conversationsHistoryMessages is not an array: ${conversationsHistoryMessages?.toString()}`
    );
  }

  return Array.from(conversationsHistoryMessages)
    .reverse()
    .map((message) => {
      const ts = tryToGetValueFromJson(message, "ts");
      const text = tryToGetValueFromJson(message, "text");
      if (typeof ts !== "number" && typeof ts !== "string") {
        throw new Error(`ts is not a number or string: ${ts?.toString()}`);
      }
      if (typeof text !== "string") {
        throw new Error(`text is not a string: ${text?.toString()}`);
      }
      const userId = tryToGetValueFromJson(message, "user") || undefined;
      if (typeof userId !== "string") {
        throw new Error(`userId is not a string: ${userId?.toString()}`);
      }
      const botId = tryToGetValueFromJson(message, "bot_id") || undefined;
      if (botId != null && typeof botId !== "string") {
        throw new Error(`userId is not a string: ${botId?.toString()}`);
      }
      return {
        userId,
        botId,
        ts: ts.toString(),
        time: getPrettyJapanDatetimeString(
          new Date(parseFloat(ts.toString()) * 1000)
        ),
        text: Array.from(text).slice(0, 512).join(""),
      };
    });
}
