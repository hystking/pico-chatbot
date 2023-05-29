import { sleep } from "./lib/sleep.ts";
import { requestToSlack } from "./lib/requestToSlack.ts";
import { getPrettyJapanDatetimeString } from "./lib/getPrettyJapanDatetimeString.ts";
import { runChatbotAgent } from "./lib/runChatbotAgent.ts";
import { workspacePath } from "./lib/workspacePath.ts";
import { tryToGetValueFromJson } from "./lib/tryToGetValueFromJson.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");

async function main() {
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
  if (conversationsHistoryMessages.length === 0) {
    console.log("No messages");
    return;
  }

  // read the last message ts
  let lastMessageTs: string | undefined;
  try {
    lastMessageTs = await Deno.readTextFile(
      `${workspacePath}/state/lastMessageTs.txt`
    );
  } catch (_) {
    console.log("No lastMessageTs.txt");
  }

  const firstConversationsHistoryMessagesTs = tryToGetValueFromJson(
    conversationsHistoryMessages[0],
    "ts"
  );

  if (typeof firstConversationsHistoryMessagesTs !== "string") {
    throw new Error(
      `firstConversationsHistoryMessagesTs is not a string: ${firstConversationsHistoryMessagesTs?.toString()}`
    );
  }
  if (firstConversationsHistoryMessagesTs === lastMessageTs) {
    console.log("No new messages");
    return;
  }

  await Deno.writeTextFile(
    `${workspacePath}/state/lastMessageTs.txt`,
    firstConversationsHistoryMessagesTs
  );

  await sleep(500);

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

  if (
    tryToGetValueFromJson(
      conversationsHistoryMessages[0],
      "bot_profile",
      "id"
    ) === tryToGetValueFromJson(botProfileResponse, "profile", "bot_id")
  ) {
    console.log("Bot has already spoken");
    return;
  }

  const botProfile = conversationsHistoryMessages.find(
    (message) =>
      tryToGetValueFromJson(message, "bot_profile", "id") ===
      tryToGetValueFromJson(botProfileResponse, "profile", "bot_id")
  );

  const botUserId =
    botProfile == null ? null : tryToGetValueFromJson(botProfile, "user");

  if (typeof botUserId !== "string") {
    throw new Error(`botUserId is not a string: ${botUserId?.toString()}`);
  }

  const uniqueUsers = conversationsHistoryMessages
    .filter(
      (message) =>
        tryToGetValueFromJson(message, "bot_profile", "id") !==
        tryToGetValueFromJson(botProfileResponse, "profile", "bot_id")
    )
    .map((message) => tryToGetValueFromJson(message, "user"))
    .filter((user, index, array) => array.indexOf(user) === index);

  const userProfiles = await Promise.all(
    uniqueUsers.map(async (user, index) => {
      await sleep(index * 500);
      if (typeof user !== "string") {
        return {};
      }
      const userProfile = await requestToSlack(
        "/api/users.profile.get",
        "GET",
        { searchParams: new URLSearchParams({ user }) }
      );
      const display_name = tryToGetValueFromJson(
        userProfile,
        "profile",
        "display_name"
      );
      const real_name = tryToGetValueFromJson(
        userProfile,
        "profile",
        "real_name"
      );
      return {
        display_name,
        real_name,
        user,
      };
    })
  );

  const botName =
    tryToGetValueFromJson(botProfileResponse, "profile", "display_name") ||
    tryToGetValueFromJson(botProfileResponse, "profile", "real_name") ||
    "Chatbot";

  if (typeof botName !== "string") {
    throw new Error(`botName is not a string: ${botName?.toString()}`);
  }

  const settings = JSON.parse(
    await Deno.readTextFile(`${workspacePath}/state/settings.json`)
  );

  if (
    typeof settings !== "object" ||
    settings == null ||
    Array.isArray(settings)
  ) {
    throw new Error(`settings is not an object: ${settings?.toString()}`);
  }

  const { aiMessages, newSettings } = await runChatbotAgent({
    context: {
      time: getPrettyJapanDatetimeString(new Date()),
    },
    chatbot: {
      userId: botUserId,
      name: botName,
    },
    settings,
    users: Object.fromEntries(
      userProfiles.map(({ user, display_name, real_name }) => [
        user,
        {
          ...(real_name ? { name: real_name } : {}),
          ...(display_name ? { name: display_name } : {}),
        },
      ])
    ),
    chatMessages: Array.from(conversationsHistoryMessages)
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
        return {
          userId,
          time: getPrettyJapanDatetimeString(
            new Date(parseFloat(ts.toString()) * 1000)
          ),
          text: Array.from(text).slice(0, 512).join(""),
        };
      }),
  });

  console.log(JSON.stringify(aiMessages, null, 2));
  await Deno.writeTextFile(
    `${workspacePath}/state/settings.json`,
    JSON.stringify(newSettings, null, 2)
  );
}

async function index() {
  do {
    try {
      await main();
    } catch (error) {
      console.error(error);
    }
    await sleep(1000 * 10);
  } while (true);
}

index();
