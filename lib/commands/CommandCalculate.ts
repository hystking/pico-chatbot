import { tryToGetValue } from "../tryToGetValue.ts";
import { tryToGetValueFromJson } from "../tryToGetValueFromJson.ts";

export const CommandCalculate: CommandPrototype<"calculate"> = {
  schema: {
    properties: {
      type: {
        type: "string",
        const: "calculate",
      },
      expression: {
        type: "string",
      },
    },
  },
  execute: ({ type, params }: { type: "calculate"; params: JsonObject }) => {
    const commandExpression = tryToGetValueFromJson(params, "expression");
    if (typeof commandExpression !== "string") {
      return {
        type,
        error: "expression is not a string",
      };
    }
    try {
      const result = eval(commandExpression) as unknown;
      return { type, success: tryToGetValue(result)?.toString() };
    } catch (e: unknown) {
      return { type, error: tryToGetValue(e)?.toString() };
    }
  },
};
