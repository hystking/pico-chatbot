import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { fetchWithTimeout } from "../fetchWithTimeout.ts";
import { tryToGetValueFromJson } from "../tryToGetValueFromJson.ts";

function cleanUpText(text: string) {
  return text
    .split("\n")
    .map((line) => line.replaceAll("s+", " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export const CommandWebGet: CommandPrototype<"web.get"> = {
  schema: {
    properties: {
      type: {
        type: "string",
        const: "web.get",
      },
      url: {
        type: "string",
      },
    },
  },
  execute: async ({
    type,
    params,
  }: {
    type: "web.get";
    params: JsonObject;
  }) => {
    const commandUrl = tryToGetValueFromJson(params, "url");
    if (typeof commandUrl !== "string") {
      return {
        type,
        error: "url is not a string",
      };
    }
    const response = await fetchWithTimeout(commandUrl, {}, 1000 * 30);
    if (!response.ok) {
      return {
        type,
        error: `response is not ok: ${response.status}`,
      };
    }
    const document = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );

    if (document == null) {
      return {
        type,
        error: "failed to parse html",
      };
    }

    const title = cleanUpText(
      document.querySelector("title")?.textContent ?? ""
    );
    const description = cleanUpText(
      document.querySelector("meta[name=description]")?.textContent ?? ""
    );

    const elements: string[][] = [];
    document.querySelectorAll("h1, h2, h3, p")?.forEach((element) => {
      elements.push([
        element.nodeName.toLowerCase(),
        Array.from(cleanUpText(element.textContent)).splice(0, 128).join(""),
      ]);
    });
    return {
      type,
      success: {
        title,
        description,
        elements,
      },
    };
  },
};
