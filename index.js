const fs = require("fs");
const { sleep } = require("./lib/sleep");
const { requestToSlack } = require("./lib/requestToSlack");
const {
  getPrettyJapanDatetimeString,
} = require("./lib/getPrettyJapanDatetimeString");
const { communicateWithAi } = require("./lib/communicateWithAi");
const getMemoryKeys = require("./lib/getMemoryKeys");
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

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

  if (!conversationsHistory.ok) {
    throw new Error(
      `conversationsHistory.ok is false: ${conversationsHistory.error}`
    );
  }

  if (conversationsHistory.messages.length === 0) {
    console.log("No messages");
    return;
  }

  // read the last message ts
  let lastMessageTs = null;
  try {
    lastMessageTs = fs
      .readFileSync(`${__dirname}/state/lastMessageTs.txt`)
      .toString();
  } catch (e) {
    console.log("No lastMessageTs.txt");
  }

  if (conversationsHistory.messages[0].ts === lastMessageTs) {
    console.log("No new messages");
    return;
  }

  // save the last message ts
  fs.writeFileSync(
    `${__dirname}/state/lastMessageTs.txt`,
    conversationsHistory.messages[0].ts
  );

  await sleep(500);

  const botProfileResponse = await requestToSlack(
    "/api/users.profile.get",
    "GET",
    {}
  );

  if (!botProfileResponse.ok) {
    throw new Error(`botInfo.ok is false: ${botProfileResponse.error}`);
  }

  if (
    conversationsHistory.messages[0].bot_profile?.id ===
    botProfileResponse.profile.bot_id
  ) {
    console.log("Bot has already spoken");
    return;
  }

  const botUserId = conversationsHistory.messages.find(
    (message) => message.bot_profile?.id === botProfileResponse.profile.bot_id
  )?.user;

  const uniqueUsers = conversationsHistory.messages
    .filter(
      (message) => message.bot_profile?.id !== botProfileResponse.profile.bot_id
    )
    .map((message) => message.user)
    .filter((user, index, array) => array.indexOf(user) === index);

  const userProfiles = await Promise.all(
    uniqueUsers.map(async (user, index) => {
      await sleep(index * 500);
      const userProfile = await requestToSlack(
        "/api/users.profile.get",
        "GET",
        { searchParams: new URLSearchParams({ user }) }
      );
      return {
        ...userProfile.profile,
        user,
      };
    })
  );
  const botName =
    botProfileResponse.profile.display_name ||
    botProfileResponse.profile.real_name ||
    "Bot";

  const settings = JSON.parse(
    fs.readFileSync(`${__dirname}/state/settings.json`).toString()
  );

  const memories = JSON.parse(
    fs.readFileSync(`${__dirname}/state/memories.json`).toString()
  );

  const userContentToAi = JSON.stringify({
    context: {
      time: getPrettyJapanDatetimeString(new Date()),
    },
    settings,
    memoryKeys: getMemoryKeys(memories),
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
    messages: Array.from(conversationsHistory.messages)
      .reverse()
      .map(({ text, user, ts }) => ({
        user_id: user,
        time: getPrettyJapanDatetimeString(new Date(parseFloat(ts * 1000))),
        text: Array.from(text).slice(0, 512).join(""),
      })),
  });

  await communicateWithAi([
    {
      role: "system",
      content: fs.readFileSync(`${__dirname}/systemPrompts.md`).toString(),
    },
    { role: "user", content: userContentToAi },
  ]);
}

main();
