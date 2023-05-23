const fs = require("fs");
const { requestToSlack } = require("./requestToSlack");
const traverse = require("./traverse");
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const SETTINGS_MAX_SIZE = 1024;

async function exectuteCommand({ type, ...params }) {
  switch (type) {
    case "chat": {
      const chatPostMessage = await requestToSlack(
        "/api/chat.postMessage",
        "POST",
        {
          bodyObj: {
            channel: SLACK_CHANNEL_ID,
            text: params.text,
          },
        }
      );
      if (!chatPostMessage.ok) {
        throw new Error(
          `chatPostMessage.ok is false: ${chatPostMessage.error}`
        );
      }
      return { type, message: `success.` };
    }
    case "setting.set": {
      const value =
        params.value != null && typeof params.value === "object"
          ? JSON.stringify(params.value)
          : params.value;
      const settings = fs
        .readFileSync(`${__dirname}/../state/settings.json`)
        .toString();
      const settingsObj = JSON.parse(settings);
      const keys = params.key.split(".");

      // keys の先頭が settings の場合は消す
      if (keys[0] === "settings") {
        keys.shift();
      }

      let target = settingsObj;
      for (let key of keys.slice(0, -1)) {
        if (target[key] == null) {
          target[key] = {};
        }
        target = target[key];
      }
      if (value == null) {
        target[keys.at(-1)] = undefined;
      } else {
        target[keys.at(-1)] = value;
      }
      const writeResult = JSON.stringify(settingsObj);
      if (SETTINGS_MAX_SIZE < writeResult.length) {
        return {
          type,
          error: `settings is too large: ${writeResult.length}. max is ${SETTINGS_MAX_SIZE}`,
        };
      }
      fs.writeFileSync(
        `${__dirname}/../state/settings.json`,
        JSON.stringify(settingsObj)
      );
      return { type, success: `${params.key} is set.` };
    }
    case "memory.set": {
      const value =
        params.value != null && typeof params.value === "object"
          ? JSON.stringify(params.value)
          : params.value;
      const memories = fs
        .readFileSync(`${__dirname}/../state/memories.json`)
        .toString();
      const memoriesObj = JSON.parse(memories);
      const keys = params.key.split(".");
      let target = memoriesObj;
      for (let key of keys.slice(0, -1)) {
        if (target[key] == null) {
          target[key] = {};
        }
        target = target[key];
      }
      if (value == null) {
        target[keys.at(-1)] = undefined;
      } else {
        target[keys.at(-1)] = value;
      }
      fs.writeFileSync(
        `${__dirname}/../state/memories.json`,
        JSON.stringify(memoriesObj)
      );
      return { type, success: `${params.key} is set.` };
    }
    case "memory.read": {
      const memories = fs
        .readFileSync(`${__dirname}/../state/memories.json`)
        .toString();
      const memoriesObj = JSON.parse(memories);
      const keys = params.key.split(".");
      let target = memoriesObj;
      for (let key of keys) {
        if (target[key] == null) {
          return {
            type,
            error: `${params.key} is not found.`,
          };
        }
        target = target[key];
      }
      return { type, success: `${params.key} is "${target}".` };
    }
    case "math": {
      try {
        const result = eval(params.expression);
        return { type, success: result };
      } catch (e) {
        return { type, error: e.message };
      }
    }
    default: {
      return { type, error: `unknown command.` };
    }
  }
}

module.exports = {
  exectuteCommand,
};
