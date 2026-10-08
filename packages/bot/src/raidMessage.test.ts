import type { AnnouncedEvent, Signup } from "@vxv/server";
import type { APIEmbed } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { emoji } from "./emojis.ts";
import { raidMessage, SIGNUP_BUTTON_PREFIX } from "./raidMessage.ts";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";
const BLANK = "​";
const start = Date.UTC(2026, 11, 12, 20) / 1000;

/** The players arrive one minute apart, in the order the test signs them up. */
let arrivals = 0;
function signup(characterName: string, overrides: Partial<Signup> = {}): Signup {
  arrivals += 1;
  return {
    eventId: EVENT_ID,
    memberId: characterName,
    characterId: characterName,
    characterName,
    characterClass: "ROGUE",
    role: "dps",
    spec: "Combat",
    status: "present",
    signedUpAt: new Date(Date.UTC(2026, 11, 1) + arrivals * 60_000),
    ...overrides,
  };
}

function raid(signups: Signup[]): AnnouncedEvent {
  return {
    event: {
      id: EVENT_ID,
      startsAt: new Date("2026-12-12T20:00:00Z"),
      softReservesPerPlayer: 2,
      raids: [
        { id: "onyxia", name: "Onyxia" },
        { id: "hyjal", name: "Mont Hyjal" },
      ],
      kind: "raid",
      title: undefined,
      role: undefined,
      discordMessageId: undefined,
    },
    signups,
  };
}

const embedOf = (announced: AnnouncedEvent): APIEmbed => raidMessage(announced, "https://vxv.test").embeds?.[0] ?? {};

describe("raid sign-up message", () => {
  it("shows the raids in squared capitals, when, the soft reserves, the audience and a link to the site", () => {
    const embed = embedOf(raid([]));
    expect(embed.title).toBe("🄾🄽🅈🅇🄸🄰 + 🄼🄾🄽🅃 🄷🅈🄹🄰🄻");
    expect(embed.url).toBe(`https://vxv.test/evenements/${EVENT_ID}`);
    expect(embed.description).toBe(
      [
        `⏳ <t:${start}:R>`,
        `${emoji("sr")} 2 SR par joueur`,
        "👥 Ouvert à tous",
        `${emoji("role_tank")} 0 · ${emoji("role_heal")} 0 · ${emoji("role_dps_melee")} 0`,
      ].join("\n"),
    );
    expect(embed.fields?.slice(0, 3)).toEqual([
      { name: BLANK, value: `📅 <t:${start}:D>`, inline: true },
      { name: BLANK, value: `🕐 <t:${start}:t>`, inline: true },
      { name: BLANK, value: "👥 **0**", inline: true },
    ]);
  });

  it("shows the role an event is reserved to, mentioned", () => {
    const reserved = raid([]);
    reserved.event.role = { id: "1194373648929263676", name: "Raideur R1" };
    expect(embedOf(reserved).description).toContain("\n👥 Réservé à <@&1194373648929263676>\n");
  });

  it("lists the tanks, then each class, under their spec's icon and number of arrival, then the other answers", () => {
    const embed = embedOf(
      raid([
        signup("Ciel Gris", { role: "tank", spec: "Protection", characterClass: "WARRIOR" }),
        signup("Ðéjà Vu", { status: "late" }),
        signup("Eole Hermes", { status: "maybe", characterClass: "DRUID" }),
        signup("Ugly Hole", { status: "absent" }),
        signup("Thom Leboss", { role: "healer", spec: "Lumière", characterClass: "PRIEST" }),
      ]),
    );
    expect(embed.description).toContain(
      `${emoji("role_tank")} 1 · ${emoji("role_heal")} 1 · ${emoji("role_dps_melee")} 1`,
    );
    expect(embed.fields?.slice(2).map((field) => [field.name, field.value])).toEqual([
      [BLANK, "👥 **3**"],
      [`${emoji("role_tank")} __Tank__ (1)`, `${emoji("spe_guerrier_protection")} \`1\` **Ciel Gris**`],
      [`${emoji("guerrier")} __Guerrier__ (0)`, BLANK],
      [`${emoji("paladin")} __Paladin__ (0)`, BLANK],
      [`${emoji("chasseur")} __Chasseur__ (0)`, BLANK],
      [
        `${emoji("voleur")} __Voleur__ (1)`,
        `${emoji("spe_voleur_combat")} \`2\` **Ðéjà Vu** ${emoji("statut_retard")}`,
      ],
      // A spec the player wrote is no icon: their class's, and the spec in words.
      [`${emoji("pretre")} __Prêtre__ (1)`, `${emoji("pretre")} \`5\` **Thom Leboss** (Lumière)`],
      [`${emoji("chaman")} __Chaman__ (0)`, BLANK],
      [`${emoji("mage")} __Mage__ (0)`, BLANK],
      [`${emoji("demoniste")} __Démoniste__ (0)`, BLANK],
      [`${emoji("druide")} __Druide__ (0)`, BLANK],
      [`${emoji("statut_peutetre")} __Peut-être__ (1)`, "`3` Eole Hermes"],
      [`${emoji("statut_absent")} __Absent__ (1)`, "`4` Ugly Hole"],
    ]);
  });

  it.each([40, 100])("shows all of %i players within Discord's limits, the crowd without icons", (players) => {
    const crowd = Array.from({ length: players }, (_, index) => signup(`Personnage Numéro${String(index)}`));
    const embed = embedOf(raid(crowd));
    const fields = embed.fields ?? [];
    const length = fields.reduce(
      (total, field) => total + field.name.length + field.value.length,
      (embed.title?.length ?? 0) + (embed.description?.length ?? 0) + (embed.footer?.text.length ?? 0),
    );
    expect(length).toBeLessThanOrEqual(6000);
    expect(fields.length).toBeLessThanOrEqual(25);
    expect(fields.filter((field) => field.value.length > 1024)).toEqual([]);
    // The rogues' column, maybe over several fields, in order of arrival.
    const first = fields.findIndex((field) => field.name.includes("__Voleur__"));
    const next = fields.findIndex((field, index) => index > first && field.name !== BLANK);
    const lines = fields
      .slice(first, next)
      .flatMap((field) => field.value.split("\n"))
      // Without its icon, a player's spec is written in words.
      .map((line) => line.replace(/^<:\w+:\d+> /, "").replace(/ \(Combat\)$/, ""));
    expect(lines).toEqual(crowd.map((player, index) => `\`${String(index + 1)}\` **${player.characterName}**`));
    expect(fields[first]?.value.includes(emoji("spe_voleur_combat"))).toBe(players === 40);
  });

  it("carries a sign-up button that names the event, never pinging anybody", () => {
    const message = raidMessage(raid([]), "https://vxv.test");
    expect(JSON.stringify(message.components)).toContain(`"custom_id":"${SIGNUP_BUTTON_PREFIX}${EVENT_ID}"`);
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });
});
