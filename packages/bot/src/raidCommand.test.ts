import type { PGliteInterface } from "@vxv/database/testing";
import type { Application } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import type { APIInteractionResponse } from "discord-api-types/v10";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotContext } from "./commands.ts";
import { VXV_RAID } from "./raidCommand.ts";
import { createTestApplication, RAID_CHANNEL, TEST_GUILD_ID, TEST_ROLES } from "./testApplication.ts";
import { autocomplete, slashCommand, withOptions, type TestActor } from "./testing.ts";

const OFFICER: TestActor = { userId: "100", name: "Officier", roleIds: [TEST_ROLES.officer], channelId: "anywhere" };
const MEMBER: TestActor = { userId: "200", name: "Membre", channelId: "anywhere" };
const NEXT_YEAR = new Date().getUTCFullYear() + 1;

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

describe("/vxv_raid", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication(["Ðéjà;Vu;ROGUE"]));
    await database.exec(`
      insert into raids (id, name, instance_id) values ('onyxia', 'Onyxia', 249), ('hyjal', 'Mont Hyjal', 534);
    `);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  /** The role picked by the officer: @everyone, which Discord gives the server's id, unless said otherwise. */
  const create = async (actor: TestActor, options: Record<string, string>, role = TEST_GUILD_ID) =>
    contentOf(await VXV_RAID.run(withOptions(slashCommand("vxv_raid", options, actor), "Role", { role }), context));
  const plan = { raid: "onyxia", date: `12/12/${NEXT_YEAR}`, heure: "21:00", motif: "Raid de la semaine" };

  it("lets an officer create an event, published in the raid channel", async () => {
    expect(await create(OFFICER, { ...plan, raid2: "Mont Hyjal" })).toBe(
      `Événement créé et publié dans <#${RAID_CHANNEL}>.`,
    );
    const [event] = await app.events.listUpcoming("raid");
    expect(event?.raids.map((raid) => raid.name)).toEqual(["Mont Hyjal", "Onyxia"]);
    expect(event?.startsAt).toEqual(new Date(`${NEXT_YEAR}-12-12T20:00:00Z`));
    expect(event?.role).toBeUndefined();
    const [message] = discord.messages();
    expect(message?.channelId).toBe(RAID_CHANNEL);
    expect(event?.discordMessageId).toBe(message?.id);
  });

  it("reserves the event to the role the officer picked", async () => {
    const raiders = discord.addRole("Raideur R1");
    await create(OFFICER, plan, raiders);
    const [event] = await app.events.listUpcoming("raid");
    expect(event?.role).toEqual({ id: raiders, name: "Raideur R1" });
  });

  it("refuses a role VXV gives, such as a class", async () => {
    const classRole = discord.addRole("Démoniste");
    await expect(create(OFFICER, plan, classRole)).rejects.toThrow(/qui peut s'inscrire/);
  });

  it("refuses members who are not officers, and invalid dates", async () => {
    await expect(create(MEMBER, plan)).rejects.toThrow("Cette action est réservée aux officiers.");
    expect(await create(OFFICER, { ...plan, date: "31/02" })).toMatch(/^Date ou heure invalide/);
    expect(await app.events.listUpcoming("raid")).toEqual([]);
  });

  it("suggests the raids matching what the officer types", async () => {
    const response = await VXV_RAID.autocomplete(autocomplete("vxv_raid", "raid", "hyj", OFFICER), context);
    expect(response.data.choices).toEqual([{ name: "Mont Hyjal", value: "hyjal" }]);
  });
});
