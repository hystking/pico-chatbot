import { requestToSlack } from "./requestToSlack.ts";
import { tryToGetValueFromJson } from "./tryToGetValueFromJson.ts";
import { type fetchChatMessages } from "./fetchChatMessages.ts";

export async function fetchChatbotProfile({
  chatMessages,
}: {
  chatMessages: PromiseReturnType<typeof fetchChatMessages>;
}) {
  const botProfileResponse = await requestToSlack(
    "/api/users.profile.get",
    "GET",
    {}
  );

  if (!tryToGetValueFromJson(botProfileResponse, "ok")) {
    throw new Error(
      `botInfo.ok is false: ${tryToGetValueFromJson(
        botProfileResponse,
        "error"
      )?.toString()}`
    );
  }

  const ChatbotChatMessage = chatMessages.find(
    (message) =>
      message.botId ===
      tryToGetValueFromJson(botProfileResponse, "profile", "bot_id")
  );

  const botName =
    tryToGetValueFromJson(botProfileResponse, "profile", "display_name") ||
    tryToGetValueFromJson(botProfileResponse, "profile", "real_name") ||
    undefined;

  if (botName != null && typeof botName !== "string") {
    throw new Error(`botName is not a string: ${botName?.toString()}`);
  }

  return {
    userId: ChatbotChatMessage?.userId,
    name: botName,
  };
}
