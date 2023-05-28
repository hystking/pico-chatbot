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

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatContext = {
  time: string;
};

type Chatbot = {
  userId: string;
  name: string;
};

type User = {
  name: string;
};

type ChatMessage = {
  userId: string;
  time: string;
  text: string;
};
