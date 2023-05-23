type ChatCommand = { type: "chat"; text: string };
type SettingSetCommand = { type: "setting.set"; key: string; value: string };
type MemorySetCommand = { type: "memory.set"; key: string; value: string };
type MemoryReadCommand = { type: "memory.read"; key: string };
type MathCommand = { type: "math"; expression: string };

type OpenAiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface ArrayConstructor {
  isArray(arg: any): arg is unknown[];
}

interface JSON {
  parse(text: string, reviver?: (key: any, value: any) => any): unknown;
}

interface Response {
  json(): Promise<unknown>;
}
