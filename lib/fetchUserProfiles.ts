import { sleep } from "./sleep.ts";
import { requestToSlack } from "./requestToSlack.ts";
import { tryToGetValueFromJson } from "./tryToGetValueFromJson.ts";
import { type fetchChatMessages } from "./fetchChatMessages.ts";
import { type fetchChatbotProfile } from "./fetchChatbotProfile.ts";

export async function fetchUserProfiles({
  chatMessages,
  chatbotProfile,
}: {
  chatMessages: PromiseReturnType<typeof fetchChatMessages>;
  chatbotProfile: PromiseReturnType<typeof fetchChatbotProfile>;
}) {
  const uniqueUsers = chatMessages
    .filter((chatMessage) => chatMessage.userId !== chatbotProfile.userId)
    .map((chatMessage) => chatMessage.userId)
    .filter((userId, index, array) => array.indexOf(userId) === index);

  const userProfiles = await Promise.all(
    uniqueUsers.map(async (user, index) => {
      await sleep(index * 500);
      if (typeof user !== "string") {
        return {};
      }
      const userProfile = await requestToSlack(
        "/api/users.profile.get",
        "GET",
        { searchParams: new URLSearchParams({ user }) }
      );
      const display_name = tryToGetValueFromJson(
        userProfile,
        "profile",
        "display_name"
      );
      const real_name = tryToGetValueFromJson(
        userProfile,
        "profile",
        "real_name"
      );
      return {
        display_name,
        real_name,
        user,
      };
    })
  );

  const ret: Record<
    string,
    {
      name: string | undefined;
    }
  > = {};

  for (const userProfile of userProfiles) {
    if (userProfile.user == null) {
      continue;
    }
    ret[userProfile.user] = {
      name:
        userProfile.real_name?.toString() ??
        userProfile.display_name?.toString(),
    };
  }

  return ret;
}
