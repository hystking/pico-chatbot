/**
 * @description
 * Try to get a value from a json object. if the value is not found, return undefined.
 * @example
 * ```ts
 * import { tryToGetValueFromJson } from "./tryToGetValueFromJson.ts";
 * const obj = {
 *   key1: {
 *     key2: {
 *       key3: "value",
 *     },
 *   },
 * };
 * const value = tryToGetValueFromJson(obj, "key1", "key2", "key3");
 * console.log(value); // "value"
 * ```
 */
export function tryToGetValueFromJson(obj: JsonValue, ...keys: string[]): JsonValue | undefined {
  let value: JsonValue = obj;
  for (const key of keys) {
    if (
      value != null &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      key in value
    ) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  if (value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object") {
    return value;
  }
  return undefined;
}
