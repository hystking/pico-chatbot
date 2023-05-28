import { requestToOpenAi } from "./requestToOpenAi.ts";
import { tryToGetValue } from "./tryToGetValue.ts";

export async function askToAi(
  messages: readonly Message[],
  {
    model,
  }: {
    model: string;
  }
) {
  console.log(`[askToAi]
model: ${model}
messages: ${JSON.stringify({ messages }, null, 2)}`)
  const aiResponse = await requestToOpenAi(
    "/v1/chat/completions",
    "POST",
    {
      bodyObj: {
        model,
        messages,
        temperature: 0,
        max_tokens: 2048,
        frequency_penalty: 2,
      },
    }
  );

  const error = tryToGetValue(aiResponse, "error");
  if (error != null) {
    throw new Error(`aiResponse.error: ${error.toString()}`);
  }

  const aiResponseChoices = tryToGetValue(aiResponse, "choices");

  if (!Array.isArray(aiResponseChoices)) {
    throw new Error(`aiResponse.choices is not array`);
  }

  const firstAiResponseChoices = aiResponseChoices[0];

  const content = tryToGetValue(firstAiResponseChoices, "message", "content");
  if (typeof content !== "string") {
    throw new Error(`content is not string`);
  }
  console.log(`content: ${content}`);
  return content;
}
