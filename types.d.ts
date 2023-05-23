interface ArrayConstructor {
  // deno-lint-ignore no-explicit-any
  isArray(arg: any): arg is unknown[];
}

interface JSON {
  // deno-lint-ignore no-explicit-any
  parse(text: string, reviver?: (key: any, value: any) => any): unknown;
}

interface Response {
  json(): Promise<unknown>;
}
