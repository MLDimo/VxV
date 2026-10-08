import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The bot's emojis: one PNG each, named after the emoji, sorted in folders by kind. */
const EMOJIS_DIR = fileURLToPath(new URL("../emojis/", import.meta.url));
const EXTENSION = ".png";

export interface EmojiFile {
  name: string;
  path: string;
}

const byName = ([left]: readonly [string, string], [right]: readonly [string, string]) => left.localeCompare(right);

/** The images of the bot's emojis, sorted by name. */
export async function emojiFiles(): Promise<EmojiFile[]> {
  const files = await readdir(EMOJIS_DIR, { recursive: true });
  return files
    .filter((file) => file.endsWith(EXTENSION))
    .map((file) => ({ name: basename(file, EXTENSION), path: join(EMOJIS_DIR, file) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** The text of emojiIds.ts for these emojis' ids on Discord. */
export function emojiIdsSource(ids: readonly (readonly [string, string])[]): string {
  return [
    "// Printed by `npm run upload-emojis -w @vxv/bot` at each production deployment when it differs: do not edit by hand.",
    "",
    "/** The bot's application emojis on Discord, by name: the id a message writes each with. */",
    "export const EMOJI_IDS = {",
    ...[...ids].sort(byName).map(([name, id]) => `  ${name}: "${id}",`),
    "} as const;",
    "",
  ].join("\n");
}
