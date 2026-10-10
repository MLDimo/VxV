import { describe, expect, it } from "vitest";
import { startRaid } from "./fixtures.ts";
import { killAndOpen, link, LINKS, OFFICER, PANEL_ROWS, raidWithData, settle, type Guild } from "./raidGroup.ts";

const TETE = link(20, "Tête d'Onyxia");
const CAPE = link(99, "Cape inconnue");
const ECAILLE = link(30, "Écaille d'Onyxia");
const BATON = link(40, "Bâton du dragon");
/** A muted text (§2.1: secondary text color). */
const GREY = (text: string) => `|cffa49bbd${text}|r`;

const rows = (guild: Guild, name: string) => guild.player(name).client(PANEL_ROWS) as unknown as string[];
const chat = (guild: Guild) =>
  (guild.player(OFFICER).client("return ChatSent") as unknown as { text: string }[]).map((message) => message.text);
const lastRow = (guild: Guild, name: string) => rows(guild, name).at(-1);

/** The master looter clicks the item's row in the loot panel. */
function pick(guild: Guild, itemName: string): void {
  guild.player(OFFICER).client(`FindWidget(VXV_LootPanel, function(widget)
      return widget.row and widget.row.start and widget.row.start.link:find(${JSON.stringify(itemName)}, 1, true)
  end):Run("OnMouseUp")`);
  settle(guild, 1);
}

/** The game writes these /roll results in everybody's system channel; the master looter's addon reads them. */
function rolls(guild: Guild, ...results: [string, number, number?][]): void {
  for (const [name, roll, high = 100] of results) {
    guild.player(OFFICER).client(`Fire("CHAT_MSG_SYSTEM", "${name} obtient un ${String(roll)} (1-${String(high)}).")`);
  }
}

function clickButton(guild: Guild, name: string, text: string): void {
  guild.player(name).client(`FindButton(VXV_LootPanel, ${JSON.stringify(text)}):Run("OnClick")`);
  settle(guild, 1);
}

const buttonShown = (guild: Guild, name: string, text: string) =>
  guild.player(name).client(`local button = FindButton(VXV_LootPanel, ${JSON.stringify(text)})
      return button ~= nil and button.shown`);

const given = (guild: Guild) => guild.player(OFFICER).client("return Given") as unknown as { name: string }[];

describe("attributing an item", () => {
  it("gives an item reserved by a single player of the raid without a roll", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
    killAndOpen(guild, [LINKS.tete]);
    pick(guild, "Tête");
    expect(chat(guild)).toContain(`[VXV] ${TETE} : SR de Thom Leboss (+20), attribué sans roll.`);
    expect(lastRow(guild, "Thom Leboss")).toBe("Tu avais la seule SR : l'objet est pour toi.");
    expect(lastRow(guild, "Aube Claire")).toBe("Objet SR par Thom Leboss : attribué sans roll.");
    expect(lastRow(guild, OFFICER)).toBe("Gagnant : Thom Leboss (SR+)");

    clickButton(guild, OFFICER, "Donner à Thom Leboss");
    expect(given(guild)).toEqual([{ slot: 1, name: "Thom Leboss" }]);
    expect(rows(guild, "Aube Claire")).not.toContain("Objet SR par Thom Leboss : attribué sans roll.");
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("lets only the reservers roll, adds their SR+ bonus and marks the other rolls invalid", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire", "Ciel Gris"]);
    killAndOpen(guild, [LINKS.tete]);
    pick(guild, "Tête");
    expect(chat(guild)).toContain(`[VXV] ${TETE} : SR de Thom Leboss (+20), Ciel Gris. Eux seuls roll (30 s).`);
    expect(lastRow(guild, "Thom Leboss")).toBe("Tu as une SR : fais ton roll. Ton SR+ ajoute 20.");
    expect(lastRow(guild, "Ciel Gris")).toBe("Tu as une SR : fais ton roll.");
    expect(lastRow(guild, "Aube Claire")).toBe("Objet SR par Thom Leboss, Ciel Gris : tu ne peux pas roll.");
    expect(buttonShown(guild, "Thom Leboss", "Roll (1-100)")).toBe(true);
    expect(buttonShown(guild, "Aube Claire", "Roll (1-100)")).toBe(false);

    rolls(
      guild,
      ["Ciel Gris", 95],
      ["Thom Leboss", 80],
      ["Aube Claire", 99],
      ["Ciel Gris", 97],
      ["Thom Leboss", 50, 60],
    );
    expect(rows(guild, OFFICER).slice(-5)).toEqual([
      "Ciel Gris : 95",
      "Thom Leboss : 80 + 20 = 100",
      GREY("Aube Claire : 99 (pas de SR)"),
      GREY("Ciel Gris : 97 (déjà roll)"),
      GREY("Thom Leboss : 50 (pas 1-100)"),
    ]);

    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${TETE} : Thom Leboss gagne (80 + 20 = 100).`);
    expect(lastRow(guild, "Aube Claire")).toBe("Thom Leboss gagne.");
    clickButton(guild, OFFICER, "Donner à Thom Leboss");
    expect(given(guild)).toEqual([{ slot: 1, name: "Thom Leboss" }]);
  });

  it("lets everybody roll an item without reserver, and rolls a tie again between the tied players", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    killAndOpen(guild, [LINKS.cape]);
    pick(guild, "Cape");
    expect(chat(guild)).toContain(`[VXV] ${CAPE} : aucune SR, tout le monde peut roll (30 s).`);
    expect(lastRow(guild, "Aube Claire")).toBe("Aucune SR : tu peux roll.");

    rolls(guild, ["Aube Claire", 50], ["Thom Leboss", 50], [OFFICER, 12]);
    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${CAPE} : égalité entre Aube Claire, Thom Leboss (50). Relancez (30 s).`);
    expect(lastRow(guild, "Aube Claire")).toBe("Égalité : relance ton roll.");
    expect(rows(guild, OFFICER)).toContain("Égalité entre Aube Claire, Thom Leboss : eux seuls relancent.");

    rolls(guild, ["Thom Leboss", 70], ["Aube Claire", 20], [OFFICER, 99]);
    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${CAPE} : Thom Leboss gagne (70).`);
    expect(lastRow(guild, OFFICER)).toBe("Gagnant : Thom Leboss (roll libre)");
  });

  it("keeps a free roll to the classes that may equip the item: no panel and no roll for the others", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    guild.player("Thom Leboss").client('Player.class = "PRIEST"');
    guild.player(OFFICER).client('GroupClasses = { ["Thom Leboss"] = "PRIEST", ["Aube Claire"] = "ROGUE" }');
    killAndOpen(guild, [LINKS.baton]);
    for (const name of ["Thom Leboss", "Aube Claire"]) {
      guild.player(name).client("VXV_LootPanel:Hide()");
    }
    pick(guild, "Bâton");
    expect(chat(guild)).toContain(
      `[VXV] ${BATON} : aucune SR, roll libre pour les classes qui peuvent l'équiper (30 s).`,
    );
    // The priest's panel opens to roll; the rogue's stays closed, and says why if opened.
    expect(guild.player("Thom Leboss").client("return VXV_LootPanel.shown")).toBe(true);
    expect(guild.player("Aube Claire").client("return VXV_LootPanel.shown")).toBe(false);
    guild.player("Aube Claire").client('SlashCmdList.VXV("butin")');
    expect(lastRow(guild, "Aube Claire")).toBe("Ta classe ne peut pas équiper cet objet : pas de roll pour toi.");
    expect(buttonShown(guild, "Aube Claire", "Roll (1-100)")).toBe(false);

    rolls(guild, ["Aube Claire", 99], ["Thom Leboss", 40]);
    expect(rows(guild, OFFICER)).toContain(GREY("Aube Claire : 99 (ne peut pas l'équiper)"));
    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${BATON} : Thom Leboss gagne (40).`);
  });

  it("leaves an excluded item to the loot council: the master looter picks the winner", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    killAndOpen(guild, [LINKS.ecaille]);
    pick(guild, "Écaille");
    expect(chat(guild)).toContain(`[VXV] ${ECAILLE} : pas de roll, attribué par l'organisation (loot council).`);
    expect(lastRow(guild, "Thom Leboss")).toBe(
      "Ce loot n'est pas disponible au roll : l'organisation l'attribue (loot council).",
    );
    expect(rows(guild, OFFICER).slice(-4)).toEqual(["Donner à (loot council)", "Aube Claire", "Thom Leboss", OFFICER]);

    guild.player(OFFICER).client(`FindWidget(VXV_LootPanel, function(widget)
        return widget.row and widget.row.give == "Aube Claire"
    end):Run("OnMouseUp")`);
    settle(guild, 1);
    expect(given(guild)).toEqual([{ slot: 1, name: "Aube Claire" }]);
  });

  it("opens the item to everybody when no reserver rolled, then leaves it to the council when nobody did", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Ciel Gris"]);
    killAndOpen(guild, [LINKS.tete]);
    pick(guild, "Tête");
    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${TETE} : aucune SR n'a roll, l'objet passe en roll libre (30 s).`);
    settle(guild);
    expect(chat(guild)).toContain(`[VXV] ${TETE} : personne n'a roll, l'organisation l'attribue.`);
    expect(rows(guild, OFFICER)).toContain("Donner à (loot council)");
  });

  it("rolls from the panel's button, takes the attribution from the master looter only, and one item at a time", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"]);
    killAndOpen(guild, [LINKS.cape, LINKS.tete]);
    guild
      .player("Aube Claire")
      .client(`VXV.Broadcast("loot.start", { itemId = 99, link = ${LINKS.cape}, mode = "free" }, "RAID")`);
    settle(guild, 1);
    expect(rows(guild, "Thom Leboss")).not.toContain("Aucune SR : tu peux roll.");

    pick(guild, "Cape");
    clickButton(guild, "Thom Leboss", "Roll (1-100)");
    expect(guild.player("Thom Leboss").client("return Rolled")).toEqual([{ low: 1, high: 100 }]);
    expect(buttonShown(guild, "Thom Leboss", "Roll (1-100)")).toBe(false);

    guild.player(OFFICER).bundles.Raid?.run(`local _, ns = ... ns.Distribution.Start({ slot = 2, itemId = 20,
        link = ${LINKS.tete} })`);
    expect(guild.player(OFFICER).client("return Printed")).toContain(
      "|cff14b8a6VXV|r Une attribution est déjà en cours : termine-la ou annule-la.",
    );
    clickButton(guild, OFFICER, "Annuler");
    expect(buttonShown(guild, OFFICER, "Annuler")).toBe(false);
  });

  it("tells the master looter when the winner cannot receive the item", () => {
    const guild = raidWithData([OFFICER, "Thom Leboss", "Aube Claire"], ["Ciel Gris"]);
    killAndOpen(guild, [LINKS.tete]);
    guild.player(OFFICER).client('LootCandidates = { "Ðéjà Vu" }');
    pick(guild, "Tête");
    clickButton(guild, OFFICER, "Donner à Thom Leboss");
    expect(guild.player(OFFICER).client("return Printed")).toContain(
      "|cff14b8a6VXV|r Thom Leboss ne peut pas recevoir l'objet : rouvre le corps, ou vérifie qu'il est assez près.",
    );
    expect(guild.player(OFFICER).client("return #Given")).toBe(0);
  });
});

describe("reading the /roll results", () => {
  it("reads the name, the roll and the bounds with the game's format, and nothing from a secret message", () => {
    const { core } = startRaid();
    const parse = (text: string) => core.run(`local _, ns = ... return ns.Rolls.Parse(${text})`);
    expect(parse('"Ðéjà Vu obtient un 98 (1-100)."')).toEqual({ name: "Ðéjà Vu", roll: 98, low: 1, high: 100 });
    expect(parse('"Ðéjà Vu a quitté le groupe."')).toBeUndefined();
    expect(parse("SECRET")).toBeUndefined();
  });
});
