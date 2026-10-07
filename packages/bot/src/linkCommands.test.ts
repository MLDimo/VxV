import type { PGliteInterface } from "@vxv/database/testing";
import type { Application } from "@vxv/server";
import type { APIInteractionResponse } from "discord-api-types/v10";
import type { FakeDiscord } from "@vxv/server/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotContext, SlashCommand } from "./commands.ts";
import { VXV_MAIN, VXV_REROLL } from "./linkCommands.ts";
import { createTestApplication, LINK_CHANNEL, SERVER_OWNER } from "./testApplication.ts";
import { autocomplete, slashCommand, type TestActor } from "./testing.ts";

const LINKS = LINK_CHANNEL;
const ME: TestActor = { userId: "200", name: "Déjà", channelId: LINKS };
const OTHER: TestActor = { userId: "300", name: "Autre", channelId: LINKS };

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

describe("character linking commands", () => {
  let database: PGliteInterface;
  let app: Application;
  let context: BotContext;
  let discord: FakeDiscord;

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication([
      "Ðéjà;Vu;ROGUE",
      "Eole;Hermes;DRUID",
      "Ugly;Hole;WARRIOR",
    ]));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const reply = async (command: SlashCommand, typed: string, actor = ME) =>
    contentOf(await command.run(slashCommand(command.definition.name, { personnage: typed }, actor), context));
  const suggest = async (typed: string) =>
    (await VXV_MAIN.autocomplete(autocomplete("vxv_main", "personnage", typed, ME), context)).data.choices;

  it("suggests the guild characters matching what the member types, accents ignored", async () => {
    expect(await suggest("deja")).toEqual([{ name: "Ðéjà Vu · Voleur", value: expect.any(String) }]);
  });

  it("links the chosen main, then a reroll typed in full, as the website would", async () => {
    const dejaId = String((await suggest("ðéjà"))?.[0]?.value);
    expect(await reply(VXV_MAIN, dejaId)).toBe(
      "Ðéjà Vu est maintenant ton personnage principal. Pseudo Discord et rôle de classe mis à jour.",
    );
    expect(discord.nicknameOf(ME.userId)).toBe("Déjà - [Ðéjà Vu]");
    expect(discord.roleNamesOf(ME.userId)).toEqual(["Voleur"]);
    expect(await reply(VXV_REROLL, "eole hermes")).toBe("Eole Hermes est lié à ton compte comme reroll.");

    const me = await app.auth.identify({ discordId: ME.userId, discordName: ME.name }, []);
    const mine = await app.characters.listMine(me);
    expect(mine.map((character) => [character.firstName, character.isMain])).toEqual([
      ["Ðéjà", true],
      ["Eole", false],
    ]);
  });

  it("tells the server owner to change their nickname by hand, and still gives the class role", async () => {
    const owner = { ...ME, userId: SERVER_OWNER, name: "GM" };
    expect(await reply(VXV_MAIN, "Eole Hermes", owner)).toMatch(/Rôle de classe mis à jour.*à la main/);
    expect(discord.roleNamesOf(SERVER_OWNER)).toEqual(["Druide"]);
  });

  it("explains how to find a character missing from the guild list", async () => {
    expect(await reply(VXV_MAIN, "Inconnu Total")).toMatch(/^Personnage introuvable dans la liste de guilde/);
  });

  it("only works in the linking channel", async () => {
    expect(await reply(VXV_MAIN, "Ðéjà Vu", { ...ME, channelId: "general" })).toBe(
      `Les personnages se lient dans le salon <#${LINKS}>.`,
    );
  });

  it("neither suggests nor links a character claimed by another member", async () => {
    await reply(VXV_MAIN, "Ugly Hole", OTHER);
    expect(await suggest("ugly")).toEqual([]);
    expect(await reply(VXV_MAIN, "Ugly Hole")).toMatch(/^Personnage introuvable/);
  });
});
