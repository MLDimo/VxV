import type { PGliteInterface } from "@vxv/database/testing";
import type { Application } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import type { APIEmbed, APIInteractionResponse } from "discord-api-types/v10";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotContext } from "./commands.ts";
import { emoji } from "./emojis.ts";
import { VXV_MISSION } from "./missionCommand.ts";
import { createTestApplication, MISSIONS_CHANNEL, SITE_URL, TEST_ROLES } from "./testApplication.ts";
import { slashCommand, withOptions, type TestActor } from "./testing.ts";

const OFFICER: TestActor = { userId: "100", name: "Officier", roleIds: [TEST_ROLES.officer], channelId: "anywhere" };
const MEMBER: TestActor = { userId: "200", name: "Membre", channelId: "anywhere" };

/** French typography keeps numbers and units together with no-break spaces. */
const plain = (text: string | undefined) => text?.replace(/[\u00a0\u202f]/gu, " ");

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

describe("/vxv_mission", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication(["Sira;Ventargent;HUNTER"]));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const publish = async (actor: TestActor, options: Record<string, string>, reward = 2000) =>
    contentOf(
      await VXV_MISSION.run(
        withOptions(slashCommand("vxv_mission", options, actor), "Integer", {
          recompense: reward,
        }),
        context,
      ),
    );
  const embed = () => (discord.messages()[0]?.body.embeds as APIEmbed[] | undefined)?.[0];

  it("lets an officer publish a week's mission, its title by its type, in the missions channel", async () => {
    expect(await publish(OFFICER, { type: "fishing", motif: "Mission de la semaine" })).toBe(
      `Mission publiée dans <#${MISSIONS_CHANNEL}>.`,
    );
    const [view] = await app.missions.list();
    expect(view?.mission).toMatchObject({ title: "Le Grand Pêcheur", type: "fishing", reward: 2000 });
    expect((view?.mission.endsAt.getTime() ?? 0) - (view?.mission.startsAt.getTime() ?? 0)).toBe(7 * 24 * 3600 * 1000);
    expect(discord.messages()[0]?.channelId).toBe(MISSIONS_CHANNEL);
    expect(embed()?.title).toBe(`${emoji("quete")} Le Grand Pêcheur`);
    expect(embed()?.url).toBe(`${SITE_URL}/quetes/${view?.mission.id ?? ""}`);
    expect(embed()?.fields?.map((field) => [plain(field.name), plain(field.value)])).toEqual([
      [`${emoji("po")} Récompense : 2 000 po`, "1er 1 400 po · 2e 400 po · 3e 200 po"],
      ["Classement", "Personne pour l'instant."],
    ]);
  });

  it("refuses a member, and shows the ranking once the companions bring the counters", async () => {
    await expect(publish(MEMBER, { type: "fishing", motif: "Motif" })).rejects.toThrow(
      "Cette action est réservée aux officiers.",
    );
    await publish(OFFICER, { type: "fishing", titre: "La Pêche du siècle", motif: "Motif" });
    const officer = await app.auth.identify({ discordId: OFFICER.userId, discordName: OFFICER.name }, [
      TEST_ROLES.officer,
    ]);
    const [character] = await app.characters.listAvailable();
    await app.characters.link(officer, character?.id ?? "", true);
    const now = Date.now();
    await app.missions.recordReadings(officer, [
      { name: "Sira Ventargent", type: "fishing", value: 10, at: new Date(now - 1000) },
      { name: "Sira Ventargent", type: "fishing", value: 52, at: new Date(now) },
    ]);
    const [view] = await app.missions.list();
    await app.missionAnnouncements.announce(view?.mission.id ?? "");
    expect(embed()?.title).toBe(`${emoji("quete")} La Pêche du siècle`);
    expect(embed()?.fields?.[1]?.value).toBe("1. Sira Ventargent — 42 pêches réussies");
  });
});
