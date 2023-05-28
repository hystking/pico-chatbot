export function traverse(
  object: unknown,
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
        traverse(value, callback, path.concat(key));
      }
    });
  }
}
