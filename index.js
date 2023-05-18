const fs = require("fs");
const { sleep } = require("./lib/sleep");
const { requestToSlack } = require("./lib/requestToSlack");
const { requestToOpenAi } = require("./lib/requestToOpenAi");

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

function getPrettyJapanDatetimeString(date) {
  // cancel timezone offset
  const utcDate = new Date(
    date.getTime() + date.getTimezoneOffset() * 60 * 1000
  );
  const japanDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

  const year = japanDate.getFullYear();
  const month = japanDate.getMonth() + 1;
  const day = japanDate.getDate();
  const hourStr = `0${japanDate.getHours()}`.slice(-2);
  const minuteStr = `0${japanDate.getMinutes()}`.slice(-2);
  const secondStr = `0${japanDate.getSeconds()}`.slice(-2);
  return `${year}/${month}/${day} ${hourStr}:${minuteStr}:${secondStr}`;
}

async function main() {
  const conversationsHistory = await requestToSlack(
    "/api/conversations.history",
    "POST",
    {
      bodyObj: {
        channel: SLACK_CHANNEL_ID,
        limit: 20,
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
  const lastMessageTs = fs
    .readFileSync(`${__dirname}/lastMessageTs.txt`)
    .toString();

  if (conversationsHistory.messages[0].ts === lastMessageTs) {
    console.log("No new messages");
    return;
  }

  // save the last message ts
  fs.writeFileSync(
    `${__dirname}/lastMessageTs.txt`,
    conversationsHistory.messages[0].ts
  );

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

  await sleep(500);

  const botInfo = await requestToSlack("/api/users.profile.get", "GET", {});

  if (!botInfo.ok) {
    throw new Error(`botInfo.ok is false: ${botInfo.error}`);
  }

  const botUserProfile = userProfiles.find(
    (userProfile) => userProfile.bot_id === botInfo.profile.bot_id
  );

  const userContentToAi = JSON.stringify({
    context: {
      lang: "ja",
      current_datetime: getPrettyJapanDatetimeString(new Date()),
    },
    bot_profile: {
      user_id: botUserProfile.user,
      display_name: botUserProfile.display_name,
      real_name: botUserProfile.real_name,
    },
    user_profiles: userProfiles
      .filter((userProfile) => userProfile.user !== botUserProfile.user)
      .map(({ user, display_name, real_name }) => ({
        user_id: user,
        display_name: display_name,
        real_name: real_name,
      })),
    messages: Array.from(conversationsHistory.messages)
      .reverse()
      .map(({ text, user, ts }) => ({
        user_id: user,
        datetime: getPrettyJapanDatetimeString(new Date(parseFloat(ts * 1000))),
        text: Array.from(text).slice(0, 1024).join(""),
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
        { role: "system", content: userContentToAi },
      ],
      temperature: 0,
      max_tokens: 1024,
      frequency_penalty: 1,
    },
  });

  const aiResponseObj = JSON.parse(aiResponse.choices[0].message.content);
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

  await sleep(500);

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
