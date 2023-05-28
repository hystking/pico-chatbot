import {
  fromFileUrl,
  dirname,
  join,
} from "https://deno.land/std@0.188.0/path/mod.ts";

export const workspacePath = join(dirname(fromFileUrl(import.meta.url)), "..");
