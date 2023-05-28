import { askToAi } from "../askToAi.ts";
import { traverse } from "../traverse.ts";
import { yesOrNo } from "../yesOrNo.ts";

export async function summarizeChatContext({
  context,
  chatbot,
  users,
  chatMessages,
  settings,
}: {
  context: ChatContext;
  chatbot: Chatbot;
  users: Record<string, User>;
  chatMessages: ChatMessage[];
  settings: object;
}) {
  const messages = [
    {
      role: "system",
      content:
        `You are a chatbot. An illustration of your participation in the chat scenario is represented in JSON format. Begin by succinctly describing the flow of the conversation.

Next, within the conversation, is there anyone who needs your help? Or, regardless of that, are you likely to say something next? Respond while respecting the settings. Answer with either 'yes' or 'no', and provide a succinct reason.

Chatbot settings: ${JSON.stringify(settings)}

Respond in the following format:

Summary: ...
Response needed: Yes/No. Because ...
`,
    },
    {
      role: "user",
      content: JSON.stringify({
        context,
        chatbot,
        users,
        chatMessages,
      }),
    },
  ] as const;

  const content = await askToAi(messages, {
    model: "gpt-4",
  });


  if (!content.match(/Summary:/i) || !content.match(/Response\s+needed:/i) || !content.match(/Because/i)) {
    throw new Error(
      `Invalid response. ${content}`
    );
  }

  // split by "Response needed:"
  const [section1, section2] = content.split(/Response\s+needed:/i);

  const summaryContent = section1.replace(/Summary:/i, "").trim();
  const responseNeededContent = section2.trim();
  const responseNeeded = yesOrNo(responseNeededContent);
  const responseNeededBecause = `because ${responseNeededContent.split(/\s+Because\s+/i).slice(1).join(" Because ")}`;

  return {
    summaryContent,
    responseNeededContent,
    responseNeeded,
    responseNeededBecause,
  };
}
