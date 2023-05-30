import { sleep } from "./lib/sleep.ts";
import { getPrettyJapanDatetimeString } from "./lib/getPrettyJapanDatetimeString.ts";
import { runChatbotAgent } from "./lib/runChatbotAgent.ts";
import { workspacePath } from "./lib/workspacePath.ts";
import { fetchChatbotProfile } from "./lib/fetchChatbotProfile.ts";
import { fetchUserProfiles } from "./lib/fetchUserProfiles.ts";
import { fetchChatMessages } from "./lib/fetchChatMessages.ts";

async function main() {
  const chatMessages = await fetchChatMessages();
  await sleep(500);
  const chatbotProfile = await fetchChatbotProfile({ chatMessages });

  if (chatMessages.length === 0) {
    console.log("No messages");
    return;
  }

  const lastChatMessageTs = chatMessages.at(-1)?.ts;
  try {
    const lastMessageTs = await Deno.readTextFile(
      `${workspacePath}/state/lastMessageTs.txt`
    );
    if (lastChatMessageTs === lastMessageTs) {
      console.log("No new messages");
      return;
    }
  } catch (_) {
    console.log("No lastMessageTs.txt");
  }
  await Deno.writeTextFile(
    `${workspacePath}/state/lastMessageTs.txt`,
    lastChatMessageTs || ""
  );

  if (chatMessages.at(-1)?.userId === chatbotProfile.userId) {
    console.log("Bot has already spoken");
    return;
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

  await sleep(500);
  const userProfiles = await fetchUserProfiles({
    chatMessages,
    chatbotProfile,
  });

  const { aiMessages, newSettings } = await runChatbotAgent({
    context: {
      time: getPrettyJapanDatetimeString(new Date()),
    },
    chatbotProfile,
    settings,
    userProfiles,
    chatMessages: chatMessages.map(({ userId, time, text }) => ({
      userId,
      time,
      text,
    })),
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
