import { tryToGetValue } from "../tryToGetValue.ts";
import { tryToGetValueFromJson } from "../tryToGetValueFromJson.ts";

const SETTINGS_MAX_SIZE = 1024;

function setValueToJson(
  obj: JsonObject,
  keys: string[],
  value: string | null | undefined
) {
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) {
    Object.keys(obj).forEach((key) => {
      (obj as Record<string, unknown>)[key] = undefined;
    });
    return;
  }
  let target: JsonValue = obj;
  for (const key of keys.slice(0, -1)) {
    if (typeof target !== "object" || target == null || Array.isArray(target)) {
      throw new Error("key is invalid");
    }
    if (target[key] != null && typeof target[key] !== "object") {
      throw new Error("key is invalid");
    }
    if (target[key] == null) {
      target[key] = {};
    }
    target = target[key];
  }
  const lastKey = keys.at(-1);
  if (lastKey == null) {
    throw new Error("key is invalid");
  }
  if (typeof target !== "object" || target == null || Array.isArray(target)) {
    throw new Error("key is invalid");
  }
  if (value == null) {
    delete target[lastKey];
  } else {
    target[lastKey] = value;
  }
}

/**
 * @description
 * Set a value to settings.
 */
export const CommandSettingsSet: CommandPrototype<"settings.set"> = {
  schema: {
    properties: {
      type: {
        type: "string",
        const: "settings.set",
      },
      key: {
        type: "string",
        descripntion: 'A path to a nested object, such as "key1.key2.key3".',
      },
      value: {
        type: "string",
        descripntion: "The value to set. if null, delete.",
      },
    },
  },
  execute: ({
    type,
    params,
    settings,
  }: {
    type: "settings.set";
    params: JsonObject;
    settings: JsonObject;
  }) => {
    const commandValue = tryToGetValueFromJson(params, "value");
    if (typeof commandValue !== "string" && commandValue != null) {
      return {
        type,
        error: "value is not a string or null",
      };
    }
    const commandKey = tryToGetValueFromJson(params, "key");
    if (typeof commandKey !== "string") {
      return {
        type,
        error: "key is not a string",
      };
    }
    const keys = commandKey.split(".");

    // keys の先頭が settings の場合は消す
    if (keys[0] === "settings") {
      keys.shift();
    }

    try {
      setValueToJson(settings, keys, commandValue);
    } catch (e: unknown) {
      return {
        type,
        error: tryToGetValue(e)?.toString(),
      };
    }
    const writeResult = JSON.stringify(settings);
    if (SETTINGS_MAX_SIZE < writeResult.length) {
      return {
        type,
        error: `settings is too large: ${writeResult.length}. max is ${SETTINGS_MAX_SIZE}`,
      };
    }

    return { type, success: `${commandKey} is set.` };
  },
};
