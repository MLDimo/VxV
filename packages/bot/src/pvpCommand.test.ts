import type { PGliteInterface } from "@vxv/database/testing";
import type { Application } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import type { APIEmbed, APIInteractionResponse } from "discord-api-types/v10";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotContext } from "./commands.ts";
import { VXV_PVP } from "./pvpCommand.ts";
import { createTestApplication, PVP_CHANNEL, TEST_GUILD_ID, TEST_ROLES } from "./testApplication.ts";
import { slashCommand, withOptions, type TestActor } from "./testing.ts";

const OFFICER: TestActor = { userId: "100", name: "Officier", roleIds: [TEST_ROLES.officer], channelId: "anywhere" };
const MEMBER: TestActor = { userId: "200", name: "Membre", channelId: "anywhere" };
const NEXT_YEAR = new Date().getUTCFullYear() + 1;

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

describe("/vxv_pvp", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication(["Ðéjà;Vu;ROGUE"]));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const create = async (actor: TestActor, options: Record<string, string>) =>
    contentOf(
      await VXV_PVP.run(withOptions(slashCommand("vxv_pvp", options, actor), "Role", { role: TEST_GUILD_ID }), context),
    );
  const plan = { titre: "Raid sur Astranaar", date: `12/12/${NEXT_YEAR}`, heure: "21:00", motif: "Sortie du jeudi" };

  it("lets an officer plan a PvP outing, published in the PvP channel without soft reserves", async () => {
    expect(await create(OFFICER, plan)).toBe(`Événement créé et publié dans <#${PVP_CHANNEL}>.`);
    const [outing] = await app.events.listUpcoming("pvp");
    expect(outing).toMatchObject({ kind: "pvp", title: "Raid sur Astranaar", raids: [], softReservesPerPlayer: 0 });
    expect(await app.events.listUpcoming("raid")).toEqual([]);
    const [message] = discord.messages();
    expect(message?.channelId).toBe(PVP_CHANNEL);
    const [embed] = message?.body.embeds as APIEmbed[];
    expect(embed?.title).toBe("Raid sur Astranaar");
    expect(embed?.url).toMatch(/\/pvp\/evenements\//);
    expect(embed?.description).not.toContain("SR");
  });

  it("refuses members who are not officers, a missing title and invalid dates", async () => {
    await expect(create(MEMBER, plan)).rejects.toThrow("Cette action est réservée aux officiers.");
    await expect(create(OFFICER, { ...plan, titre: " " })).rejects.toThrow(/Donnez un titre/);
    expect(await create(OFFICER, { ...plan, date: "31/02" })).toMatch(/^Date ou heure invalide/);
    expect(await app.events.listUpcoming("pvp")).toEqual([]);
  });
});
