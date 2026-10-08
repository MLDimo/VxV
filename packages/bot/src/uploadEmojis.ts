// Usage: DISCORD_BOT_TOKEN=… DISCORD_CLIENT_ID=… npm run upload-emojis -w @vxv/bot
// Adds to the bot's Discord application the emojis it lacks (run after each production deployment), then compares
// their ids with src/emojiIds.ts and, when they differ, prints the file to commit.
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { emojiFiles, emojiIdsSource } from "./emojiFiles.ts";
import { EMOJI_IDS } from "./emojiIds.ts";

const DISCORD_API = "https://discord.com/api/v10";
const HTTP_TOO_MANY_REQUESTS = 429;
const MS_PER_SECOND = 1000;

const { DISCORD_BOT_TOKEN: token, DISCORD_CLIENT_ID: applicationId } = process.env;
if (!token || !applicationId) {
  throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.");
}

interface Emoji {
  id: string;
  name: string;
}

/** A call to the application's emojis, waiting as long as Discord asks when it limits the rate. */
async function emojis<Result>(method: "GET" | "POST", body?: unknown): Promise<Result> {
  const response = await fetch(`${DISCORD_API}/applications/${applicationId}/emojis`, {
    method,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === HTTP_TOO_MANY_REQUESTS) {
    const { retry_after: retryAfter } = (await response.json()) as { retry_after: number };
    await setTimeout(retryAfter * MS_PER_SECOND);
    return emojis(method, body);
  }
  if (!response.ok) {
    throw new Error(`Discord refused ${method} emojis (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as Result;
}

const files = await emojiFiles();
const { items } = await emojis<{ items: Emoji[] }>("GET");
const ids = new Map(items.map((emoji) => [emoji.name, emoji.id]));
for (const { name, path } of files) {
  if (!ids.has(name)) {
    const image = `data:image/png;base64,${(await readFile(path)).toString("base64")}`;
    ids.set(name, (await emojis<Emoji>("POST", { name, image })).id);
    console.log(`Émoji ajouté : ${name}`);
  }
}

const expected = emojiIdsSource(files.map(({ name }) => [name, ids.get(name) ?? ""]));
if (expected === emojiIdsSource(Object.entries(EMOJI_IDS))) {
  console.log(`${files.length} émojis à jour.`);
} else {
  console.log("::warning::src/emojiIds.ts ne correspond pas aux émojis du bot : le remplacer par le texte qui suit.");
  process.stdout.write(expected);
}
