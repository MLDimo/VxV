import { describe, expect, it } from "vitest";
import { FOREVER_EVENTS } from "../forever.ts";
import { startGuild } from "../guild.ts";
import { importText, ONYXIA_NIGHT, startRaid, websiteText } from "./fixtures.ts";

const RAID = { bundles: ["VXV_Raid"] };
const PREFIX = "|cff14b8a6VXV|r ";
const OFFICER = "Ðéjà Vu";
const OPEN_RAID_TAB = `
  SlashCmdList.VXV("")
  FindWidget(VXV_Window, function(widget) return widget.text == "Raid" end):Run("OnClick")
`;
const CLICK = (text: string) =>
  `FindWidget(VXV_Window, function(widget) return widget.text == ${JSON.stringify(text)} end):Run("OnClick")`;

type Guild = ReturnType<typeof startGuild>;

function settle(guild: Guild, seconds = 30): void {
  for (let second = 0; second < seconds; second += 1) {
    guild.deliver();
    guild.advanceTime(1);
  }
  guild.deliver();
}

/** The officer, two signed-up members (Thom Leboss expected, Ciel Gris on the bench with a reroll) and Aube
 * Claire, not signed up; the officer loaded the event and opened the invitations. */
function openRaid(): Guild {
  const guild = startGuild([OFFICER, "Thom Leboss", "Ciel Gris", "Aube Claire"], RAID);
  settle(guild);
  const officer = guild.player(OFFICER);
  importText(officer.client, websiteText());
  settle(guild);
  officer.client(OPEN_RAID_TAB);
  officer.client(CLICK("Ouvrir les invitations"));
  settle(guild);
  return guild;
}

const printed = (guild: Guild, name: string) => guild.player(name).client("return Printed") as unknown as string[];
const invited = (guild: Guild) => guild.player(OFFICER).client("return Invited") as unknown as string[];
const join = (guild: Guild, name: string) => {
  guild.player(name).client('SlashCmdList.VXV("rejoindre")');
  settle(guild);
};

describe("forming the raid", () => {
  it("invites at once an expected member who clicks Rejoindre, and turns the party into a raid", () => {
    const guild = openRaid();
    expect(printed(guild, "Thom Leboss")).toContain(
      `${PREFIX}Ðéjà Vu a ouvert les invitations : clique sur Rejoindre le raid dans l'onglet Raid, ou tape /vxv rejoindre.`,
    );
    join(guild, "Thom Leboss");
    expect(invited(guild)).toEqual(["Thom Leboss"]);
    expect(printed(guild, "Thom Leboss")).toContain(
      `${PREFIX}Invitation envoyée par Ðéjà Vu : accepte-la pour rejoindre le raid.`,
    );

    const officer = guild.player(OFFICER);
    officer.client('JoinGroup("Thom Leboss")');
    expect(officer.client("return { ConvertedToRaid, Group.raid }")).toEqual([1, true]);
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("tells a member who logs in later that the invitations are open, once the data arrived", () => {
    const guild = openRaid();
    const late = guild.join("Lune Rousse");
    settle(guild);
    expect(late.bundles.VXV_Raid?.run("local _, ns = ... return ns.Invitations.Leader()")).toBe(OFFICER);
    expect(printed(guild, "Lune Rousse")).toContain(
      `${PREFIX}Ðéjà Vu a ouvert les invitations : clique sur Rejoindre le raid dans l'onglet Raid, ou tape /vxv rejoindre.`,
    );
  });

  it("turns a reroll, the bench and a player without sign-up into requests the officer accepts with a click", () => {
    const guild = openRaid();
    join(guild, "Ciel Gris");
    join(guild, "Aube Claire");
    // An empty Lua table reads as an object: its length tells that nobody was invited.
    expect(guild.player(OFFICER).client("return #Invited")).toBe(0);
    expect(printed(guild, "Ciel Gris")).toContain(
      `${PREFIX}Demande transmise à Ðéjà Vu (inscrit avec un reroll) : il t'invitera à la main.`,
    );
    expect(printed(guild, OFFICER)).toContain(
      `${PREFIX}Aube Claire demande à rejoindre le raid (pas inscrit) : clique sur son nom dans l'onglet Raid pour l'inviter.`,
    );

    const officer = guild.player(OFFICER);
    const requestRow = `FindWidget(VXV_Window, function(widget)
        return widget.row ~= nil and widget.row.invite == "Aube Claire" and widget.shown
    end)`;
    expect(officer.client(`return ${requestRow}.label.text`)).toBe("Aube Claire · pas inscrit");
    officer.client(`${requestRow}:Run("OnMouseUp")`);
    expect(invited(guild)).toEqual(["Aube Claire"]);
    expect(officer.client(`return ${requestRow} == nil`)).toBe(true);
  });

  it("explains why a member cannot join: invitations not open, another group, no answer", () => {
    const guild = startGuild([OFFICER, "Thom Leboss"], RAID);
    settle(guild);
    importText(guild.player(OFFICER).client, websiteText());
    settle(guild);
    join(guild, "Thom Leboss");
    expect(printed(guild, "Thom Leboss")).toContain(
      `${PREFIX}Les invitations ne sont pas encore ouvertes : un officier les ouvre depuis l'onglet Raid.`,
    );

    guild.player(OFFICER).bundles.VXV_Raid?.run("local _, ns = ... ns.Invitations.Toggle()");
    settle(guild);
    const thom = guild.player("Thom Leboss");
    thom.client('Group.members = { "Autre Joueur" }');
    join(guild, "Thom Leboss");
    expect(printed(guild, "Thom Leboss")).toContain(`${PREFIX}Quitte ton groupe actuel pour rejoindre le raid.`);

    thom.client("Group.members = {}");
    thom.client('SlashCmdList.VXV("rejoindre")');
    thom.client("TakeSentMessages() AdvanceTime(10)");
    expect(printed(guild, "Thom Leboss")).toContain(
      `${PREFIX}Pas de réponse de Ðéjà Vu : il n'est peut-être plus connecté. Réessaie, ou demande une invitation en jeu.`,
    );
  });

  it("lets only the officers open the invitations", () => {
    const guild = startGuild([OFFICER, "Thom Leboss"], RAID);
    settle(guild);
    importText(guild.player(OFFICER).client, websiteText());
    settle(guild);
    const thom = guild.player("Thom Leboss");
    thom.bundles.VXV_Raid?.run("local _, ns = ... ns.Invitations.Toggle()");
    expect(printed(guild, "Thom Leboss")).toContain(
      `${PREFIX}Réservé aux officiers que le site nomme dans les données du raid.`,
    );
    thom.client('VXV.Broadcast("raid.open", { open = true })');
    settle(guild);
    expect(guild.player(OFFICER).bundles.VXV_Raid?.run("local _, ns = ... return ns.Invitations.Leader()")).toBe(
      undefined,
    );
  });
});

describe("inviting the whole roster", () => {
  it("invites the expected players online: four in the party, the others once it becomes a raid", () => {
    const names = Array.from({ length: 8 }, (_, index) => `Joueur${index} Raideur${index}`);
    const night = {
      ...ONYXIA_NIGHT,
      signups: [
        ...ONYXIA_NIGHT.signups,
        ...names.map((name, index) => ({
          eventId: "e1",
          memberId: `m${index}`,
          characterId: `c${index}`,
          characterName: name,
          characterClass: "MAGE",
          role: "dps" as const,
          spec: "Givre",
          status: "present" as const,
        })),
      ],
      mainCharacterIds: new Set([...ONYXIA_NIGHT.mainCharacterIds, ...names.map((_, index) => `c${index}`)]),
    };
    const { client, importText: paste, registeredEvents, errors } = startRaid();
    const roster = [...names, "Thom Leboss"].map(
      (name, index) => `{ name = ${JSON.stringify(name)}, class = "MAGE", online = ${String(index !== 7)} }`,
    );
    client(`MockGuildMembers = { ${roster.join(", ")} }`);
    paste(websiteText(night));
    client('SlashCmdList.VXV("inviter")');
    client("AdvanceTime(5)");
    // Thom Leboss (late) is expected too; Ciel Gris comes with a reroll; Joueur7 is offline.
    expect(client("return Invited")).toEqual(["Thom Leboss", names[0], names[1], names[2]]);
    expect(client("return Printed")).toContain(`${PREFIX}8 invitations envoyées.`);
    expect(client("return Printed")).toContain(`${PREFIX}Hors ligne : Joueur7 Raideur7.`);

    client('JoinGroup("Thom Leboss")');
    client("AdvanceTime(5)");
    expect(client("return Invited")).toEqual(["Thom Leboss", ...names.slice(0, 7)]);
    expect(registeredEvents().filter((event) => !FOREVER_EVENTS.has(event))).toEqual([]);
    expect(errors()).toEqual([]);
  });
});
