import type { AnnouncedEvent, Signup } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { raidMessage, SIGNUP_BUTTON_PREFIX } from "./raidMessage.ts";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";

function signup(characterName: string, overrides: Partial<Signup> = {}): Signup {
  return {
    eventId: EVENT_ID,
    memberId: characterName,
    characterId: characterName,
    characterName,
    characterClass: "ROGUE",
    role: "dps",
    spec: "Combat",
    status: "present",
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

describe("raid sign-up message", () => {
  it("shows the raids, the date for every time zone, the soft reserves and a link to the site", () => {
    const [embed] = raidMessage(raid([]), "https://vxv.test").embeds ?? [];
    expect(embed?.title).toBe("Onyxia + Mont Hyjal");
    expect(embed?.url).toBe(`https://vxv.test/evenements/${EVENT_ID}`);
    const start = Date.UTC(2026, 11, 12, 20) / 1000;
    expect(embed?.description).toBe(`📅 <t:${start}:F> (<t:${start}:R>)\n🎯 2 SR par joueur\n👥 Ouvert à tous`);
  });

  it("shows the role an event is reserved to, mentioned", () => {
    const reserved = raid([]);
    reserved.event.role = { id: "1194373648929263676", name: "Raideur R1" };
    const [embed] = raidMessage(reserved, "https://vxv.test").embeds ?? [];
    expect(embed?.description).toMatch(/\n👥 Réservé à <@&1194373648929263676>$/);
  });

  it("lists the coming players by role and class, then the other answers", () => {
    const message = raidMessage(
      raid([
        signup("Ciel Gris", { role: "tank", spec: "Protection", characterClass: "WARRIOR" }),
        signup("Ðéjà Vu", { status: "late" }),
        signup("Eole Hermes", { status: "maybe", characterClass: "DRUID" }),
        signup("Ugly Hole", { status: "absent" }),
      ]),
      "https://vxv.test",
    );
    const fields = message.embeds?.[0]?.fields?.map((field) => [field.name, field.value]);
    expect(fields).toEqual([
      ["🛡️ Tank · 1", "Ciel Gris (Protection)"],
      ["✚ Soigneur · 0", "—"],
      ["⚔️ DPS · 1", "Ðéjà Vu (Combat) ⏰"],
      ["Classes", "Guerrier 1 · Voleur 1"],
      ["Peut-être · 1", "Eole Hermes (Combat)"],
      ["Absent · 1", "Ugly Hole (Combat)"],
    ]);
  });

  it("stays within Discord's field limit for a crowded role", () => {
    const crowd = Array.from({ length: 80 }, (_, index) => signup(`Personnage Numéro${index}`));
    const dps = raidMessage(raid(crowd), "https://vxv.test").embeds?.[0]?.fields?.[2]?.value ?? "";
    expect(dps.length).toBeLessThanOrEqual(1024);
    expect(dps).toMatch(/… et \d+ autres$/);
  });

  it("carries a sign-up button that names the event, never pinging anybody", () => {
    const message = raidMessage(raid([]), "https://vxv.test");
    expect(JSON.stringify(message.components)).toContain(`"custom_id":"${SIGNUP_BUTTON_PREFIX}${EVENT_ID}"`);
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });
});
