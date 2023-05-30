import { requestToOpenAi } from "./requestToOpenAi.ts";
import { sleep } from "./sleep.ts";
import { tryToGetValueFromJson } from "./tryToGetValueFromJson.ts";
import { CommandWebGet } from "./commands/CommandWebGet.ts";
import { CommandSettingsSet } from "./commands/CommandSettingsSet.ts";
import { CommandChat } from "./commands/CommandChat.ts";
import { CommandCalculate } from "./commands/CommandCalculate.ts";
const LOOP_MAX = 5;

const COMMAND_PROTOTYPES = [
  CommandChat,
  CommandCalculate,
  CommandSettingsSet,
  CommandWebGet,
] as const;

/**
 * @description
 * Run the chatbot agent. The agent executes the commands and responds to the user.
 */
export async function runChatbotAgent({
  context,
  chatbotProfile,
  userProfiles,
  chatMessages,
  settings,
}: {
  context: {
    readonly time: string;
  };
  chatbotProfile: {
    readonly userId: string | undefined;
    readonly name: string | undefined;
  };
  userProfiles: Record<
    string,
    {
      readonly name: string | undefined;
    }
  >;
  chatMessages: {
    readonly userId: string;
    readonly time: string;
    readonly text: string;
  }[];
  settings: JsonObject;
}) {
  const newSettings = JSON.parse(JSON.stringify(settings));

  if (
    newSettings == null ||
    typeof newSettings !== "object" ||
    Array.isArray(newSettings)
  ) {
    throw new Error(`newSettings is not an object: ${newSettings?.toString()}`);
  }

  const aiMessages: AiMessage[] = [
    {
      role: "system",
      content:
        'You are a chatbot agent. The input is provided in JSON format, where "task" is your task. Output your response as a JSON following the "responseSchema" format. The response should be minified.',
    } as const,
    {
      role: "user",
      content: JSON.stringify({
        task: 'An illustration of your participation in the chat scenario is represented in "conversation". Begin by succinctly describing the flow of the conversation. Next, within the conversation, is there anyone who needs your help? Or, regardless of that, are you likely to do something next? Respond while respecting the settings. Then, if you need something to do, provide commands to acomplish the task.',
        conversation: {
          context,
          chatbotProfile,
          userProfiles,
          chatMessages,
        },
        settings: newSettings,
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
                anyOf: COMMAND_PROTOTYPES.map(({ schema }) => schema),
              },
            },
          },
          required: ["summary", "responseNeeded", "responseNeededBecause"],
        },
      }),
    } as const,
  ];

  for (let i = 0; i < LOOP_MAX; i++) {
    console.log(JSON.stringify({ aiMessages }, null, 2));

    const content = await runAi({ aiMessages });

    aiMessages.push({
      role: "assistant",
      content,
    });

    const userMessage = await runCommands({ content, newSettings });
    if (userMessage == null) {
      break;
    }
    aiMessages.push(userMessage);

    await sleep(500);
  }

  return {
    aiMessages,
    newSettings,
  };
}

async function runAi({ aiMessages }: { aiMessages: AiMessage[] }) {
  const aiResponse = await requestToOpenAi("/v1/chat/completions", "POST", {
    bodyObj: {
      model: "gpt-4",
      // model: "gpt-3.5-turbo",
      messages: aiMessages,
      temperature: 0,
      max_tokens: 2048,
      frequency_penalty: 2,
    },
  });

  const error = tryToGetValueFromJson(aiResponse, "error");
  if (error != null) {
    throw new Error(`aiResponse.ok is false: ${JSON.stringify(error)}`);
  }

  const aiResponseChoices = tryToGetValueFromJson(aiResponse, "choices");

  if (!Array.isArray(aiResponseChoices)) {
    throw new Error(`aiResponse.choices is not array`);
  }

  const firstAiResponseChoices = aiResponseChoices[0];

  const content = tryToGetValueFromJson(
    firstAiResponseChoices,
    "message",
    "content"
  );

  if (typeof content !== "string") {
    throw new Error(`content is not string`);
  }

  return content;
}

async function runCommands({
  content,
  newSettings,
}: {
  content: string;
  newSettings: JsonObject;
}) {
  let aiResponseObj;
  try {
    aiResponseObj = JSON.parse(content);
  } catch (e) {
    console.log({ e, content });
    return {
      role: "user",
      content: JSON.stringify({
        error: "JSON.parse failed",
      }),
    } as const;
  }

  const commands = tryToGetValueFromJson(aiResponseObj, "commands");

  console.log(JSON.stringify({ commands }, null, 2));

  if (commands == null) {
    return {
      role: "user",
      content: JSON.stringify({
        error: "commands is undefined",
      }),
    } as const;
  }

  if (!Array.isArray(commands)) {
    return {
      role: "user",
      content: JSON.stringify({
        error: "commands is not array",
      }),
    } as const;
  }

  if (commands.length == 0) {
    return null;
  }

  const results: CommandPrototypeExecuteResult<string>[] = [];
  for (const command of commands) {
    if (
      typeof command !== "object" ||
      command == null ||
      Array.isArray(command)
    ) {
      results.push({
        type: "unknown",
        error: `command is not object: ${JSON.stringify(command)}`,
      });
      continue;
    }

    if (typeof command["type"] !== "string") {
      results.push({
        type: "unknown",
        error: `command.type is not string: ${command["type"]}`,
      });
      continue;
    }

    const CommandPrototype = COMMAND_PROTOTYPES.find(
      (cp) => cp.schema.properties.type.const === command["type"]
    );

    if (CommandPrototype == null) {
      results.push({
        type: command["type"],
        error: `unknown command.type: ${command["type"]}`,
      });
      continue;
    }
    results.push(
      await CommandPrototype.execute({
        type: command["type"],
        params: command,
        settings: newSettings,
      } as const satisfies Parameters<
        CommandPrototype<string>["execute"]
        // deno-lint-ignore no-explicit-any
      >[0] as any)
    );
  }

  return {
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
  } as const;
}
