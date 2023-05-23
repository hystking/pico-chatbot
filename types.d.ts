interface ArrayConstructor {
  isArray(arg: any): arg is unknown[];
}

interface JSON {
  parse(text: string, reviver?: (key: any, value: any) => any): unknown;
}

interface Response {
  json(): Promise<unknown>;
}
