// deno-lint-ignore no-explicit-any
type PromiseReturnType<T1 extends (...args: any) => any> = ReturnType<T1> extends Promise<infer T2> ? T2 : never;

type JsonPrimitive = string | number | boolean | null;

type JsonObject = { [key: string]: JsonValue };

type JsonArray = JsonValue[];

type JsonValue = JsonPrimitive | JsonArray | JsonObject;

interface ArrayConstructor {
  // deno-lint-ignore no-explicit-any
  isArray<T>(arg: any): arg is T[];
}

interface JSON {
  // deno-lint-ignore no-explicit-any
  parse(text: string, reviver?: (key: any, value: any) => any): JsonValue;
  stringify(
    value: JsonObject,
    replacer: (key: string, value: JsonValue) => JsonValue,
    space: number
  ): string;
}

interface Response {
  json(): Promise<JsonValue>;
}

type AiMessage = {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
};

type CommandPrototypeExecuteResult<CommandType extends string> = {
  readonly type: CommandType;
  readonly error?: JsonValue;
  readonly success?: JsonValue;
};

type CommandPrototype<CommandType extends string> = {
  readonly schema: {
    readonly properties: {
      readonly type: {
        readonly type: "string";
        readonly const: CommandType;
      };
      readonly [key: string]: JsonValue;
    };
  };
  readonly execute: (props: {
    readonly type: CommandType;
    readonly params: JsonObject;
    readonly settings: JsonObject;
  }) =>
    | Promise<CommandPrototypeExecuteResult<CommandType>>
    | CommandPrototypeExecuteResult<CommandType>;
};
