import { sleep } from "./lib/sleep.ts";
import { requestToSlack } from "./lib/requestToSlack.ts";
import { getPrettyJapanDatetimeString } from "./lib/getPrettyJapanDatetimeString.ts";
import { communicateWithAi } from "./lib/communicateWithAi.ts";
import { workspacePath } from "./lib/workspacepath.ts";
import { tryToGetValue } from "./lib/tryToGetValue.ts";
import { traverse } from "./lib/traverse.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");

async function main() {
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

  if (!tryToGetValue(conversationsHistory, "ok")) {
    throw new Error(
      `conversationsHistory.ok is false: ${tryToGetValue(
        conversationsHistory,
        "error"
      )?.toString()}`
    );
  }

  const conversationsHistoryMessages = tryToGetValue(
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

  const firstConversationsHistoryMessagesTs = tryToGetValue(
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

  if (!tryToGetValue(botProfileResponse, "ok")) {
    throw new Error(
      `botInfo.ok is false: ${tryToGetValue(
        botProfileResponse,
        "error"
      )?.toString()}`
    );
  }

  if (
    tryToGetValue(conversationsHistoryMessages[0], "bot_profile", "id") ===
    tryToGetValue(botProfileResponse, "profile", "bot_id")
  ) {
    console.log("Bot has already spoken");
    return;
  }

  const botUserId = tryToGetValue(
    conversationsHistoryMessages.find(
      (message) =>
        tryToGetValue(message, "bot_profile", "id") ===
        tryToGetValue(botProfileResponse, "profile", "bot_id")
    ),
    "user"
  );

  const uniqueUsers = conversationsHistoryMessages
    .filter(
      (message) =>
        tryToGetValue(message, "bot_profile", "id") !==
        tryToGetValue(botProfileResponse, "profile", "bot_id")
    )
    .map((message) => tryToGetValue(message, "user"))
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
      const display_name = tryToGetValue(
        userProfile,
        "profile",
        "display_name"
      );
      const real_name = tryToGetValue(userProfile, "profile", "real_name");
      return {
        display_name,
        real_name,
        user,
      };
    })
  );
  const botName =
    tryToGetValue(botProfileResponse, "profile", "display_name") ||
    tryToGetValue(botProfileResponse, "profile", "real_name") ||
    "Bot";

  const settings = JSON.parse(
    await Deno.readTextFile(`${workspacePath}/state/settings.json`)
  );

  const memories = JSON.parse(
    await Deno.readTextFile(`${workspacePath}/state/memories.json`)
  );

  if (typeof memories !== "object" || memories == null) {
    throw new Error(`memories is not an object: ${memories?.toString()}`);
  }

  const memoryKeys: string[] = [];
  traverse(memories, (path) => {
    memoryKeys.push(path.join("."));
  });

  const userContentToAi = JSON.stringify({
    context: {
      time: getPrettyJapanDatetimeString(new Date()),
    },
    settings,
    memoryKeys,
    chatbot: {
      ...(botUserId ? { user_id: botUserId } : {}),
      name: botName,
    },
    users: Object.fromEntries(
      userProfiles.map(({ user, display_name, real_name }) => [
        user,
        {
          ...(real_name ? { name: real_name } : {}),
          ...(display_name ? { name: display_name } : {}),
        },
      ])
    ),
    messages: Array.from(conversationsHistoryMessages)
      .reverse()
      .map((message) => {
        const ts = tryToGetValue(message, "ts");
        const text = tryToGetValue(message, "text");
        if (typeof ts !== "number" && typeof ts !== "string") {
          throw new Error(`ts is not a number or string: ${ts?.toString()}`);
        }
        if (typeof text !== "string") {
          throw new Error(`text is not a string: ${text?.toString()}`);
        }
        return {
          user_id: tryToGetValue(message, "user"),
          time: getPrettyJapanDatetimeString(
            new Date(parseFloat(ts.toString()) * 1000)
          ),
          text: Array.from(text).slice(0, 512).join(""),
        };
      }),
  });

  await communicateWithAi([
    {
      role: "system",
      content: await Deno.readTextFile(`${workspacePath}/systemPrompts.md`),
    },
    { role: "user", content: userContentToAi },
  ]);
}

async function index() {
  while (true) {
    try {
      await main();
    } catch (error) {
      console.error(error);
    }
    await sleep(1000 * 10);
  }
}

index();
