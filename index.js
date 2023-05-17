const fs = require("fs");
const { sleep } = require("./lib/sleep");
const { requestToSlack } = require("./lib/requestToSlack");
const { requestToOpenAi } = require("./lib/requestToOpenAi");

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

async function main() {
  const botInfo = await requestToSlack("/api/users.profile.get", "GET", {});

  if (!botInfo.ok) {
    throw new Error(`botInfo.ok is false: ${botInfo.error}`);
  }

  await sleep(500);

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

  if (
    conversationsHistory.messages[0].bot_profile?.id === botInfo.profile.bot_id
  ) {
    console.log("Bot has already spoken");
    return;
  }

  const uniqueUsers = conversationsHistory.messages
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

  const userContentToAi = JSON.stringify({
    lang: "ja",
    userProfiles: userProfiles.map(({ user, display_name, real_name }) => ({
      user_id: user,
      display_name: display_name,
      real_name: real_name,
    })),
    messages: Array.from(conversationsHistory.messages)
      .reverse()
      .map(({ text, user }) => ({
        text: Array.from(text).slice(0, 256).join(""),
        user_id: user,
      })),
  });

  const aiResponse = await requestToOpenAi("/v1/chat/completions", "POST", {
    bodyObj: {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: fs.readFileSync(`${__dirname}/systemPrompts.md`).toString(),
        },
        { role: "user", content: userContentToAi },
      ],
      temperature: 0,
      max_tokens: 256,
    },
  });

  const aiResponseObj = JSON.parse(aiResponse.choices[0].message.content);
  if (!aiResponseObj.speak || aiResponseObj.text == null) {
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
