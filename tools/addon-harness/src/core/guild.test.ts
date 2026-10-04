import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";

const RESERVED = "|cff14b8a6VXV|r VXV est réservé aux membres de la guilde.";
/** What VXV started: an enabled module, the minimap icon, the presence announce. */
const STARTED = `
  return {
      module = ModuleEnabled == true,
      icon = #Minimap.children > 0,
      announced = #SentAddonMessages > 0,
  }
`;
const WATCH_MODULE = 'VXV.RegisterModule({ id = "watch", Enable = function() ModuleEnabled = true end })';

describe("guild filter", () => {
  const startIn = (setup: string) => {
    const started = startCore({ beforeLogin: true });
    started.client(setup);
    started.core.run(WATCH_MODULE);
    started.client('Fire("PLAYER_LOGIN")');
    return started;
  };

  it.each(["VXV", "The Daliranas", "THE DALIRANAS"])("starts everything for a member of the guild %s", (name) => {
    const { client } = startIn(`GuildInfo.name = "${name}"`);
    expect(client(STARTED)).toEqual({ module: true, icon: true, announced: true });
  });

  it.each([
    ["in another guild", 'GuildInfo.name = "Les Autres"'],
    ["without a guild", "Player.inGuild = false"],
  ])("starts nothing for a player %s, and says VXV is for the guild", (_, setup) => {
    const { client, errors } = startIn(setup);
    expect(client(STARTED)).toEqual({ module: false, icon: false, announced: false });
    client('SlashCmdList.VXV("")');
    expect(client("return Printed")).toEqual([RESERVED]);
    expect(client("return VXV_Window")).toBeUndefined();
    expect(errors()).toEqual([]);
  });

  it("waits for the roster update when the client does not know the guild's name yet", () => {
    const { client } = startIn("GuildInfo.known = false");
    expect(client(STARTED)).toEqual({ module: false, icon: false, announced: false });
    expect(client("return GuildRosterRequests")).toBe(1);
    client('GuildInfo.known = true Fire("GUILD_ROSTER_UPDATE")');
    expect(client(STARTED)).toEqual({ module: true, icon: true, announced: true });
  });
});

describe("guild roster export", () => {
  const MEMBERS = `MockGuildMembers = {
      { name = "Ðéjà Vu", class = "ROGUE" },
      { name = "Thom Leboss", class = "PRIEST" },
      { name = "Marie", class = "MAGE" },
  }`;
  const COPIED = "return VXV_TextWindow.editBox:GetText()";

  it("puts the roster in the website's format in a window ready to copy, leaving out names without last name", () => {
    const { client } = startCore();
    client(MEMBERS);
    client('Printed = {} SlashCmdList.VXV("liste")');
    expect(client(COPIED)).toBe("VXV-ROSTER-1\nÐéjà;Vu;ROGUE\nThom;Leboss;PRIEST");
    expect(client("return { VXV_TextWindow:IsShown(), VXV_TextWindow.editBox.highlighted }")).toEqual([true, true]);
    expect(client("return Printed")).toEqual([
      "|cff14b8a6VXV|r Liste de 2 personnages prête : Ctrl+C, puis colle-la dans la page Liste de guilde du site.",
      "|cff14b8a6VXV|r 1 personnage laissé de côté, faute de nom de famille.",
    ]);
    expect(client("return UISpecialFrames")).toContain("VXV_TextWindow");
  });

  it("asks for the roster when the client has none yet, and exports it when it arrives", () => {
    const { client } = startCore();
    client('SlashCmdList.VXV("liste")');
    expect(client("return VXV_TextWindow")).toBeUndefined();
    client(`${MEMBERS} Fire("GUILD_ROSTER_UPDATE")`);
    expect(client(COPIED)).toContain("Thom;Leboss;PRIEST");
  });
});
