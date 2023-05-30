
/**
 * @description
 * Try to get a value from an unknown object. if the value is not found, return undefined.
 * @example
 * ```ts
 * import { tryToGetValue } from "./tryToGetValue.ts";
 * const obj = {
 *   key1: {
 *     key2: {
 *       key3: "value",
 *     },
 *   },
 * };
 * const value = tryToGetValue(obj, "key1", "key2", "key3");
 * console.log(value); // "value"
 */
export function tryToGetValue(obj: unknown, ...keys: string[]) {
  let value: unknown = obj;
  for (const key of keys) {
    if (
      value != null &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      key in value
    ) {
      value = (value as Record<string, unknown>)[key];
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
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "symbol") {
    return value;
  }
  if (typeof value === "function") {
    return value;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value === "undefined") {
    return value;
  }
  return undefined;
}
