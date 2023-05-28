import { executeCommand } from "./executeCommand.ts";
import { requestToOpenAi } from "./requestToOpenAi.ts";
import { sleep } from "./sleep.ts";
import { tryToGetValue } from "./tryToGetValue.ts";

const LOOP_MAX = 5;

export async function communicateWithAi({
  context,
  chatbot,
  users,
  chatMessages,
  settings,
}: {
  context: ChatContext;
  chatbot: Chatbot;
  users: Record<string, User>;
  chatMessages: ChatMessage[];
  // deno-lint-ignore ban-types
  settings: object;
}) {
  const messages = Array.from([
    {
      role: "system",
      content:
        'You are a chatbot agent. The input is provided in JSON format, where "task" is your task. Output your response as a JSON following the "responseSchema" format. The response should be minified.',
    },
    {
      role: "user",
      content: JSON.stringify({
        task: 'An illustration of your participation in the chat scenario is represented in "conversation". Begin by succinctly describing the flow of the conversation. Next, within the conversation, is there anyone who needs your help? Or, regardless of that, are you likely to do something next? Respond while respecting the settings. Then, if you need something to do, provide commands to acomplish the task.',
        conversation: {
          context,
          chatbot,
          users,
          chatMessages,
        },
        settings,
        responseSchema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
            },
            responseNeeded: {
              type: "boolean",
            },
            responseNeededBecause: {
              type: "string",
            },
            commands: {
              type: "array",
              items: {
                type: "object",
                anyOf: [
                  {
                    properties: {
                      type: {
                        type: "string",
                        const: "chat",
                      },
                      text: {
                        type: "string",
                      },
                    },
                  },
                  {
                    properties: {
                      type: {
                        type: "string",
                        const: "setting.set",
                      },
                      key: {
                        type: "string",
                        descripntion:
                          'A path to a nested object, such as "key1.key2.key3".',
                      },
                      value: {
                        type: "string",
                        descripntion: "The value to set. if null, delete.",
                      },
                    },
                  },
                  {
                    properties: {
                      type: {
                        type: "string",
                        const: "math",
                      },
                      expression: {
                        type: "string",
                      },
                    },
                  },
                  {
                    properties: {
                      type: {
                        type: "string",
                        const: "url.get",
                      },
                      url: {
                        type: "string",
                      },
                    },
                  },
                ],
              },
            },
          },
          required: ["summary", "responseNeeded", "responseNeededBecause"],
        },
      }),
    },
  ]);

  for (let i = 0; i < LOOP_MAX; i++) {
    console.log(JSON.stringify({ messages }, null, 2));

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
      console.log({ e, content });

      messages.push({
        role: "user",
        content: JSON.stringify({
          error: "JSON.parse failed",
        }),
      });
    }

    const commands = tryToGetValue(aiResponseObj, "commands");

    console.log(JSON.stringify({ commands }, null, 2));

    if (commands == null) {
      throw new Error(`aiResponseObj.commands is undefined`);
    }

    if (!Array.isArray(commands)) {
      throw new Error(`aiResponseObj.commands is not array`);
    }

    if (commands.length == 0) {
      console.log("No commands. Waiting for the next input.");
      return;
    }

    const results = [];
    for (const command of commands) {
      results.push(await executeCommand({ command, settings }));
    }

    console.log(JSON.stringify({ results }, null, 2));

    // if (results.length == 1 && results[0].type === "chat") {
    //   // 喋ったあとは基本的に終了
    //   return;
    // }

    messages.push({
      role: "assistant",
      content,
    });

    messages.push({
      role: "user",
      content: JSON.stringify({
        task: "Send the next commands according to the results. If you have nothing to do, return an empty commands.",
        results,
        responseSchema: {
          type: "object",
          properties: {
            commands: {
              type: "array",
            },
          },
        },
      }),
    });

    await sleep(500);
  }

  return {
    settings,
  }
}
