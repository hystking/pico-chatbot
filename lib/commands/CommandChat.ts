import { requestToSlack } from "../requestToSlack.ts";
import { tryToGetValueFromJson } from "../tryToGetValueFromJson.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");

/**
 * @description
 * Request to Slack API
 */
export const CommandChat: CommandPrototype<"chat"> = {
  schema: {
    properties: {
      type: {
        type: "string",
        const: "chat",
      },
      text: {
        type: "string",
      },
    },
  },
  execute: async ({ type, params }: { type: "chat"; params: JsonObject }) => {
    if (SLACK_CHANNEL_ID == null) {
      throw new Error("SLACK_CHANNEL_ID is not set");
    }

    const commandText = tryToGetValueFromJson(params, "text");
    if (typeof commandText !== "string") {
      return {
        type,
        error: "text is not a string",
      };
    }
    const chatPostMessage = await requestToSlack(
      "/api/chat.postMessage",
      "POST",
      {
        bodyObj: {
          channel: SLACK_CHANNEL_ID,
          text: commandText,
        },
      }
    );
    if (!tryToGetValueFromJson(chatPostMessage, "ok")) {
      return {
        type,
        error:
          tryToGetValueFromJson(chatPostMessage, "error")?.toString() ??
          "unknown error",
      };
    }
    return { type, sucess: "message was sent." };
  },
};
