const fs = require("fs");
const { sleep } = require("./lib/sleep");
const { requestToSlack } = require("./lib/requestToSlack");
const { requestToOpenAi } = require("./lib/requestToOpenAi");
const {
  getPrettyJapanDatetimeString,
} = require("./lib/getPrettyJapanDatetimeString");

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

async function main() {
  // create tmp directory if not exists
  if (!fs.existsSync(`${__dirname}/tmp`)) {
    fs.mkdirSync(`${__dirname}/tmp`);
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
      .readFileSync(`${__dirname}/tmp/lastMessageTs.txt`)
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
    `${__dirname}/tmp/lastMessageTs.txt`,
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
  const userContentToAi = JSON.stringify({
    context: {
      lang: "ja",
      time: getPrettyJapanDatetimeString(new Date()),
    },
    chatbot: {
      ...(botUserId ? { user_id: botUserId } : {}),
      name: botName,
    },
    users: userProfiles.map(({ user, display_name, real_name }) => ({
      ...(user ? { user_id: user } : {}),
      ...(real_name ? { name: real_name } : {}),
      ...(display_name ? { name: display_name } : {}),
    })),
    messages: Array.from(conversationsHistory.messages)
      .reverse()
      .map(({ text, user, ts }) => ({
        user_id: user,
        time: getPrettyJapanDatetimeString(new Date(parseFloat(ts * 1000))),
        text: Array.from(text).slice(0, 512).join(""),
      })),
  });

  console.log(userContentToAi);

  const aiResponse = await requestToOpenAi("/v1/chat/completions", "POST", {
    bodyObj: {
      model: "gpt-4",
      // model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: fs.readFileSync(`${__dirname}/systemPrompts.md`).toString(),
        },
        { role: "system", content: userContentToAi },
      ],
      temperature: 0,
      max_tokens: 2048,
    },
  });

  if (aiResponse.error) {
    throw new Error(
      `aiResponse.ok is false: ${JSON.stringify(aiResponse.error)}`
    );
  }

  const aiResponseObj = JSON.parse(aiResponse.choices[0].message.content);
  console.log(aiResponseObj);
  if (!aiResponseObj.speak || aiResponseObj.text == null) {
    console.log("No message to speak");
    return;
  }

  const newConversationsHistory = await requestToSlack(
    "/api/conversations.history",
    "POST",
    {
      bodyObj: {
        channel: SLACK_CHANNEL_ID,
        limit: 1,
      },
    }
  );

  if (!newConversationsHistory.ok) {
    throw new Error(
      `newConversationsHistory.ok is false: ${newConversationsHistory.error}`
    );
  }

  if (
    newConversationsHistory.messages[0].ts !==
    conversationsHistory.messages[0].ts
  ) {
    console.log("New message has been posted");
    return;
  }

  const chatPostMessage = await requestToSlack(
    "/api/chat.postMessage",
    "POST",
    {
      bodyObj: {
        channel: SLACK_CHANNEL_ID,
        text: aiResponseObj.text,
      },
    }
  );

  if (!chatPostMessage.ok) {
    throw new Error(`chatPostMessage.ok is false: ${chatPostMessage.error}`);
  }
}

main();
