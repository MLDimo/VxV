import { startGuild } from "../guild.ts";
import { importText, websiteText } from "./fixtures.ts";

export const OFFICER = "Ðéjà Vu";
export type Guild = ReturnType<typeof startGuild>;

/** Lua expressions of the links of the Onyxia items of the tests' event, and of an item nobody reserved. */
export const LINKS = {
  tete: 'ItemLink(20, "Tête d\'Onyxia")',
  sac: 'ItemLink(21, "Sac en peau")',
  ecaille: 'ItemLink(30, "Écaille d\'Onyxia")',
  baton: 'ItemLink(40, "Bâton du dragon")',
  cape: 'ItemLink(99, "Cape inconnue")',
};

/** The link as the client writes it. */
export function link(itemId: number, name: string): string {
  return `|cffa335ee|Hitem:${String(itemId)}::::::::60:::::|h[${name}]|h|r`;
}

/** Carries messages and moves the clocks for a while: queues and timers have run. */
export function settle(guild: Guild, seconds = 30): void {
  for (let second = 0; second < seconds; second += 1) {
    guild.deliver();
    guild.advanceTime(1);
  }
  guild.deliver();
}

/**
 * The guild of the tests' event, loaded by the officer; inRaid are in the raid, the officer being the master
 * looter, and every other player stays out.
 */
export function raidWithData(inRaid: readonly string[], outside: readonly string[] = []): Guild {
  const guild = startGuild([...inRaid, ...outside], { bundles: ["Raid"] });
  settle(guild);
  importText(guild.player(OFFICER).client, websiteText());
  settle(guild);
  for (const name of inRaid) {
    const others = inRaid.filter((other) => other !== name).map((other) => JSON.stringify(other));
    guild.player(name).client(`Group.members = { ${others.join(", ")} } Group.raid = true MasterLooter = "${OFFICER}"`);
  }
  guild.player(OFFICER).client(`LootCandidates = { ${inRaid.map((name) => JSON.stringify(name)).join(", ")} }`);
  return guild;
}

/** The boss dies for everybody, then the master looter opens its corpse holding these items. */
export function killAndOpen(guild: Guild, links: readonly string[]): void {
  for (const player of guild.players) {
    player.client('Fire("ENCOUNTER_END", 1084, "Onyxia", 9, 40, 1)');
  }
  guild.player(OFFICER).client(`CorpseLinks = { ${links.join(", ")} } Fire("LOOT_OPENED")`);
  settle(guild);
}

/** Shown texts of the loot panel's rows. */
export const PANEL_ROWS = `
  local texts = {}
  FindWidget(VXV_LootPanel, function(widget)
      if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
  end)
  return texts
`;
