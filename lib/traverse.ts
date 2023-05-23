export function traverse(
  // deno-lint-ignore ban-types
  object: object,
  callback: (path: string[], obj: unknown) => void,
  path: string[] = []
) {
  if (0 < path.length) {
    callback(path, object);
  }
  if (object != null && typeof object === "object") {
    Object.keys(object).forEach((key) => {
      if (key in object) {
        const value = (object as Record<string, unknown>)[key];
        if (value != null && typeof value === "object") {
          traverse(value, callback, path.concat(key));
        }
      }
    });
  }
}
