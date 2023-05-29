export function tryToGetValueFromJson(obj: JsonValue, ...keys: string[]) {
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
