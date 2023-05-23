import { executeCommand } from "./executeCommand.ts";
import { requestToOpenAi } from "./requestToOpenAi.ts";
import { tryToGetValue } from "./tryToGetValue.ts";

const LOOP_MAX = 5;

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function communicateWithAi(initialMessages: Message[]) {
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

    const error = tryToGetValue(aiResponse, "error");
    if (error != null) {
      throw new Error(`aiResponse.ok is false: ${JSON.stringify(error)}`);
    }

    const aiResponseChoices = tryToGetValue(aiResponse, "choices");

    if (!Array.isArray(aiResponseChoices)) {
      throw new Error(`aiResponse.choices is not array`);
    }

    const firstAiResponseChoices = aiResponseChoices[0];

    const content = tryToGetValue(firstAiResponseChoices, "message", "content");

    if (typeof content !== "string") {
      throw new Error(`content is not string`);
    }

    let aiResponseObj;
    try {
      aiResponseObj = JSON.parse(content);
    } catch (e) {
      console.log({ e });

      messages.push({
        role: "user",
        content: JSON.stringify({
          error: "JSON.parse failed",
        }),
      });
    }

    const commands = tryToGetValue(aiResponseObj, "commands");
    if (commands == null) {
      throw new Error(`aiResponseObj.commands is undefined`);
    }

    if (!Array.isArray(commands)) {
      throw new Error(`aiResponseObj.commands.length is undefined`);
    }

    messages.push({
      role: "assistant",
      content,
    });

    if (commands.length == 0) {
      return;
    }

    const results = [];
    for (const command of commands) {
      results.push(await executeCommand(command));
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
