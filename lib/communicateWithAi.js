const { exectuteCommand } = require("./executeCommand");
const { requestToOpenAi } = require("./requestToOpenAi");

const LOOP_MAX = 5;

async function communicateWithAi(initialMessages) {
  const messages = Array.from(initialMessages);
  for (let i = 0; i < LOOP_MAX; i++) {
    console.log({ messages });

    const aiResponse = await requestToOpenAi("/v1/chat/completions", "POST", {
      bodyObj: {
        model: "gpt-4",
        // model: "gpt-3.5-turbo",
        messages,
        temperature: 0,
        max_tokens: 2048,
        frequency_penalty: 2,
      },
    });

    if (aiResponse.error) {
      throw new Error(
        `aiResponse.ok is false: ${JSON.stringify(aiResponse.error)}`
      );
    }

    const { content } = aiResponse.choices[0].message;

    console.log({ content });

    let aiResponseObj;
    try {
      aiResponseObj = JSON.parse(content);
    } catch (e) {
      console.log({ e });

      messages.push({
        role: "user",
        content: {
          error: "JSON.parse failed",
        },
      });
    }

    if (!aiResponseObj.commands) {
      throw new Error(`aiResponseObj.commands is undefined`);
    }

    if (aiResponseObj.commands.length == null) {
      throw new Error(`aiResponseObj.commands.length is undefined`);
    }

    messages.push({
      role: "assistant",
      content,
    });

    if (aiResponseObj.commands.length == 0) {
      return;
    }

    const results = [];
    for (const command of aiResponseObj.commands) {
      results.push(await exectuteCommand(command));
    }

    console.log({ results });

    if (results.length == 1 && results[0].type === "chat") {
      // 喋ったあとは基本的に終了
      return;
    }

    messages.push({
      role: "user",
      content: JSON.stringify({ results }),
    });
  }
}

module.exports = { communicateWithAi };
