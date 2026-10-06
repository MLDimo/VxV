import { formatAddonDeathrolls } from "@vxv/server/domain/addonDeathrolls";
import type { Character } from "@vxv/server/domain/characters";
import { deathrollRefusal, parseDeathroll } from "@vxv/server/domain/deathrolls";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["VXV_Deathroll", "VXV_Sync"];
const THOM = "Thom Leboss";
const VORN = "Vorn Cendrelune";
const SIRA = "Sira Ventargent";

type Guild = ReturnType<typeof startGuild>;

/** Carries messages and moves the clocks until nothing is left to carry. */
function settle(guild: Guild, seconds = 5): void {
  for (let carried = 1; carried > 0;) {
    guild.advanceTime(seconds);
    carried = guild.deliver();
  }
}

const LAST_GAME = (id: string) => `local _, ns = ... return ns.Games.Find(${JSON.stringify(id)})`;
const DUEL_TEXTS = `
  local texts = {}
  FindWidget(VXV_DuelWindow, function(widget)
    if type(widget.text) == "string" then texts[#texts + 1] = widget.text end
  end)
  return texts
`;
const CLICK = (frame: string, label: string) =>
  `FindWidget(${frame}, function(widget) return widget.label and widget.label.text == ${JSON.stringify(label)} and widget.shown ~= false end):Run("OnClick")`;
/** The texts without their colors. */
const plain = (texts: unknown) => (texts as string[]).map((text) => text.replace(/\|c\w{8}(.*?)\|r/gu, "$1"));

/** Thom, Vorn and Sira connected with VXV; Thom and Vorn with their companion. */
function startTrio(): Guild {
  const guild = startGuild([SIRA], { bundles: BUNDLES });
  guild.join(THOM, { written: companionFiles({}) });
  guild.join(VORN, { written: companionFiles({}) });
  settle(guild);
  return guild;
}

/** Thom challenges Vorn for 500 po from 1000; Vorn accepts. Returns the game's id. */
function challengeAndAccept(guild: Guild): string {
  const thom = guild.player(THOM);
  expect(
    thom.bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${VORN}", "500", "1000")`),
  ).toBeUndefined();
  settle(guild);
  guild.player(VORN).client(CLICK("VXV_DeathrollChallenge", "Accepter"));
  settle(guild, 1);
  return guild.player(SIRA).bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Games.Live()[1].id`) as string;
}

/** The player rolls with the button, and the game's server answers the roll in the chat. */
function roll(guild: Guild, name: string, high: number, result: number): void {
  const player = guild.player(name);
  // The previous roll's digits have scrolled: the button shows again.
  player.client(
    `AdvanceTime(2) VXV_DuelWindow:Run("OnUpdate", 0.1) ${CLICK("VXV_DuelWindow", `Roll (1-${String(high)})`)}`,
  );
  expect(player.client("return Rolled[#Rolled]")).toEqual({ low: 1, high });
  player.client(`Fire("CHAT_MSG_SYSTEM", "${name} obtient un ${String(result)} (1-${String(high)}).")`);
  settle(guild, 1);
}

describe("the deathroll in game (P15)", () => {
  it("plays a game to the end with the buttons: challenge, bets, rolls, and the loser's debt", () => {
    const guild = startTrio();
    const id = challengeAndAccept(guild);
    // The guild hears it in its chat (P15.2); the players see their window.
    expect(guild.player(THOM).client("return ChatSent")).toEqual([
      {
        text: "[VXV] Deathroll : Thom Leboss contre Vorn Cendrelune pour 500 po, départ 1000. Paris ouverts une minute dans l'addon.",
        channel: "GUILD",
      },
    ]);
    expect(guild.player(VORN).client("return VXV_DuelWindow.shown")).toBe(true);
    // Sira bets during the minute; a player may not.
    const sira = guild.player(SIRA);
    expect(
      sira.bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Duels.Bet("${id}", "${THOM}", "100")`),
    ).toBeUndefined();
    expect(
      guild.player(THOM).bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Duels.Bet("${id}", "${THOM}", "100")`),
    ).toBe("Les joueurs ne parient pas sur leur partie.");
    settle(guild, 1);
    // No roll during the minute of bets.
    expect(
      guild
        .player(VORN)
        .client(
          `return IsVisible(FindWidget(VXV_DuelWindow, function(widget) return widget.label and widget.label.text == "Roll (1-1000)" end))`,
        ),
    ).toBe(false);
    guild.advanceTime(61);
    roll(guild, VORN, 1000, 412);
    roll(guild, THOM, 412, 87);
    // A roll out of turn is not the game's.
    guild.player(THOM).client(`Fire("CHAT_MSG_SYSTEM", "${THOM} obtient un 5 (1-87).")`);
    settle(guild, 1);
    roll(guild, VORN, 87, 1);
    for (const name of [THOM, VORN, SIRA]) {
      const game = guild.player(name).bundles.VXV_Deathroll?.run(LAST_GAME(id)) as { rolls: unknown[] };
      expect(game.rolls).toHaveLength(3);
    }
    guild.player(VORN).client("for _ = 1, 40 do AdvanceTime(0.1) VXV_DuelWindow:Run('OnUpdate', 0.1) end");
    expect(plain(guild.player(VORN).client(DUEL_TEXTS))).toContain(
      "Vorn Cendrelune a fait 1 : Thom Leboss gagne 500 po.",
    );
    // The players' companions take it to the website, which reads it within the rules.
    const sent = parseDeathroll(guild.player(VORN).client(`return VXV_SyncDB.texts.deathroll["${id}"]`) as string);
    expect(deathrollRefusal(sent)).toBeUndefined();
    expect(sent.bets).toEqual([{ bettor: SIRA, choice: THOM, amount: 100 }]);
    // Vorn owes the stake: no new challenge until Thom confirms.
    expect(
      guild
        .player(VORN)
        .bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${SIRA}", "10", "100")`),
    ).toBe("Tu as une dette (paris ou deathroll) : règle-la pour jouer de nouveau.");
    guild.player(THOM).bundles.VXV_Deathroll?.run(`local _, ns = ... ns.Duels.ConfirmPaid("${id}")`);
    settle(guild, 1);
    const paid = parseDeathroll(guild.player(THOM).client(`return VXV_SyncDB.texts.deathroll["${id}"]`) as string);
    expect(paid.paid?.by).toBe(THOM);
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("refuses a challenge to a member the website says is in debt", () => {
    const vorn: Character = {
      id: "c1",
      firstName: "Vorn",
      lastName: "Cendrelune",
      characterClass: "WARRIOR",
      memberId: "m-vorn",
      isMain: true,
      inGuild: true,
    };
    const text = formatAddonDeathrolls({
      officers: [],
      characters: [vorn],
      barred: ["m-vorn"],
      games: [],
      ranking: [{ rank: 1, memberName: "Thom Leboss", memberClass: "PRIEST", net: 500, games: 1, biggestWin: 500 }],
      exportedAt: new Date("2026-12-10T07:00:00Z"),
    });
    const { bundles, errors } = startCore({ written: companionFiles({ deathroll: text }), bundles: BUNDLES });
    expect(bundles.VXV_Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${VORN}", "10", "100")`)).toBe(
      "Vorn Cendrelune a une dette : pas de deathroll avant qu'elle soit réglée.",
    );
    expect(errors()).toEqual([]);
  });

  it("shows Le Dé Pipé's two tabs, Paris then Deathroll", () => {
    const { client } = startCore({ bundles: ["VXV_Deathroll", "VXV_Paris"] });
    client(`SlashCmdList.VXV("")
      FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Le Dé Pipé" end):Run("OnClick")`);
    const tabs = client(`
      local names = {}
      FindWidget(VXV_Window, function(widget)
        if widget.SetSelected and widget.label and (widget.label.text == "Paris" or widget.label.text == "Deathroll") then
          names[#names + 1] = widget.label.text
        end
      end)
      return names`);
    expect(tabs).toEqual(["Paris", "Deathroll"]);
    client(
      `FindWidget(VXV_Window, function(widget) return widget.SetSelected and widget.label and widget.label.text == "Deathroll" end):Run("OnClick")`,
    );
    expect(
      client(
        `return IsVisible(FindWidget(VXV_Window, function(widget) return widget.label and widget.label.text == "Défier" end))`,
      ),
    ).toBe(true);
  });
});
