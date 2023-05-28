import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { fetchWithTimeout } from "./fetchWithTimeout.ts";
import { requestToSlack } from "./requestToSlack.ts";
import { tryToGetValue } from "./tryToGetValue.ts";

const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");
const SETTINGS_MAX_SIZE = 1024;

function setValueToObject(
  // deno-lint-ignore ban-types
  obj: object,
  keys: string[],
  value: string | null | undefined
) {
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) {
    Object.keys(obj).forEach((key) => {
      (obj as Record<string, unknown>)[key] = undefined;
    });
    return;
  }
  let target = obj as Record<string, unknown>;
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

function cleanUpText(text: string) {
  return text
    .split("\n")
    .map((line) => line.replaceAll("s+", " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export async function executeCommand({
  command,
  settings,
}: {
  command: unknown;
  settings: object;
}) {
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
      const keys = commandKey.split(".");

      // keys の先頭が settings の場合は消す
      if (keys[0] === "settings") {
        keys.shift();
      }

      try {
        setValueToObject(settings, keys, commandValue);
      } catch (e) {
        return {
          type: commandType,
          error: e.toString(),
        };
      }
      const writeResult = JSON.stringify(settings);
      if (SETTINGS_MAX_SIZE < writeResult.length) {
        return {
          type: commandType,
          error: `settings is too large: ${writeResult.length}. max is ${SETTINGS_MAX_SIZE}`,
        };
      }

      return { type: commandType, success: `${commandKey} is set.` };
    }
    case "math": {
      const commandExpression = tryToGetValue(command, "expression");
      if (typeof commandExpression !== "string") {
        return {
          type: commandType,
          error: "expression is not a string",
        };
      }
      try {
        const result = eval(commandExpression);
        return { type: commandType, success: result.toString() };
      } catch (e) {
        return { type: commandType, error: e.message };
      }
    }
    case "url.get": {
      const commandUrl = tryToGetValue(command, "url");
      if (typeof commandUrl !== "string") {
        return {
          type: commandType,
          error: "url is not a string",
        };
      }
      const response = await fetchWithTimeout(commandUrl, {}, 1000 * 30);
      if (!response.ok) {
        return {
          type: commandType,
          error: `response is not ok: ${response.status}`,
        };
      }
      const document = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );

      if (document == null) {
        return {
          type: commandType,
          error: "failed to parse html",
        };
      }

      const title = cleanUpText(
        document.querySelector("title")?.textContent ?? ""
      );
      const description = cleanUpText(
        document.querySelector("meta[name=description]")?.textContent ?? ""
      );

      const elements: string[][] = [];
      document.querySelectorAll("h1, h2, h3, p")?.forEach((element) => {
        elements.push([
          element.nodeName.toLowerCase(),
          Array.from(cleanUpText(element.textContent)).splice(0, 128).join(""),
        ]);
      });
      return {
        type: commandType,
        success: {
          title,
          description,
          elements,
        },
      };
    }
  }
  return {
    type: commandType,
    error: `type is invalid: ${commandType}`,
  };
}
