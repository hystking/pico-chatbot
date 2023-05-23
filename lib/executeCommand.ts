import { requestToSlack } from "./requestToSlack.ts";
import { tryToGetValue } from "./tryToGetValue.ts";
import { workspacePath } from "./workspacepath.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");
const SETTINGS_MAX_SIZE = 1024;

function setValueToJson(
  // deno-lint-ignore ban-types
  json: object,
  keys: string[],
  value: string | null | undefined
) {
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) {
    Object.keys(json).forEach((key) => {
      (json as Record<string, unknown>)[key] = undefined;
    });
    return;
  }
  let target = json as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    const targetKeyValue = tryToGetValue(target, key);
    if (targetKeyValue != null && typeof targetKeyValue !== "object") {
      throw new Error("key is invalid");
    }
    if (targetKeyValue == null) {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  const lastKey = keys.at(-1);
  if (lastKey == null) {
    throw new Error("key is invalid");
  }
  if (value == null) {
    target[lastKey] = undefined;
  } else {
    target[lastKey] = value;
  }
}

export async function executeCommand(command: unknown) {
  const commandType = tryToGetValue(command, "type");
  if (typeof commandType !== "string") {
    return {
      error: "type is not a string",
    };
  }
  switch (commandType) {
    case "chat": {
      const commandText = tryToGetValue(command, "text");
      if (typeof commandText !== "string") {
        return {
          type: commandType,
          error: "text is not a string",
        };
      }
      const chatPostMessage = await requestToSlack(
        "/api/chat.postMessage",
        "POST",
        {
          bodyObj: {
            channel: SLACK_CHANNEL_ID,
            text: commandText,
          },
        }
      );
      if (!tryToGetValue(chatPostMessage, "ok")) {
        return {
          type: commandType,
          error: tryToGetValue(chatPostMessage, "error"),
        };
      }
      return { type: commandType, message: "success." };
    }
    case "setting.set": {
      const commandValue = tryToGetValue(command, "value");
      if (typeof commandValue !== "string" && commandValue != null) {
        return {
          type: commandType,
          error: "value is not a string or null",
        };
      }
      const commandKey = tryToGetValue(command, "key");
      if (typeof commandKey !== "string") {
        return {
          type: commandType,
          error: "key is not a string",
        };
      }
      const settings = await Deno.readTextFile(
        `${workspacePath}/state/settings.json`
      );
      const settingsObj = JSON.parse(settings);
      if (typeof settingsObj !== "object" || settingsObj == null) {
        return {
          type: commandType,
          error: "settings is not an object",
        };
      }
      const keys = commandKey.split(".");
      // keys の先頭が settings の場合は消す
      if (keys[0] === "settings") {
        keys.shift();
      }

      try {
        setValueToJson(settingsObj, keys, commandValue);
      } catch (e) {
        return {
          type: commandType,
          error: e.toString(),
        };
      }
      const writeResult = JSON.stringify(settingsObj);
      if (SETTINGS_MAX_SIZE < writeResult.length) {
        return {
          type: commandType,
          error: `settings is too large: ${writeResult.length}. max is ${SETTINGS_MAX_SIZE}`,
        };
      }
      await Deno.writeTextFile(
        `${workspacePath}/state/settings.json`,
        JSON.stringify(settingsObj)
      );
      return { type: commandType, success: `${commandKey} is set.` };
    }
    case "memory.set": {
      const commandValue = tryToGetValue(command, "value");
      if (typeof commandValue !== "string" && commandValue != null) {
        return {
          type: commandType,
          error: "value is not a string or null",
        };
      }
      const commandKey = tryToGetValue(command, "key");
      if (typeof commandKey !== "string") {
        return {
          type: commandType,
          error: "key is not a string",
        };
      }
      const memories = await Deno.readTextFile(
        `${workspacePath}/state/memories.json`
      );
      const memoriesObj = JSON.parse(memories);

      if (typeof memoriesObj !== "object" || memoriesObj == null) {
        return {
          type: commandType,
          error: "memories is not an object",
        };
      }

      const keys = commandKey.split(".");

      try {
        setValueToJson(memoriesObj, keys, commandValue);
      } catch (e) {
        return {
          type: commandType,
          error: e.toString(),
        };
      }

      await Deno.writeTextFile(
        `${workspacePath}/state/memories.json`,
        JSON.stringify(memoriesObj)
      );
      return { type: commandType, success: `${commandKey} is set.` };
    }
    case "memory.read": {
      const commandKey = tryToGetValue(command, "key");
      if (typeof commandKey !== "string") {
        return {
          type: commandType,
          error: "key is not a string",
        };
      }
      const memories = await Deno.readTextFile(
        `${workspacePath}/state/memories.json`
      );
      const value = tryToGetValue(
        JSON.parse(memories),
        ...commandKey.split(".")
      );
      if (value == null) {
        return {
          type: commandType,
          error: `${commandKey} is not found.`,
        };
      }
      return {
        type: commandType,
        success: `${commandKey} is "${value.toString()}".`,
      };
    }
    case "math": {
      try {
        const commandExpression = tryToGetValue(command, "expression");
        if (typeof commandExpression !== "string") {
          return {
            type: commandType,
            error: "expression is not a string",
          };
        }
        const result = eval(commandExpression);
        return { type: commandType, success: result.toString() };
      } catch (e) {
        return { type: commandType, error: e.message };
      }
    }
  }
  return {
    type: commandType,
    error: `type is invalid: ${commandType}`,
  };
}
