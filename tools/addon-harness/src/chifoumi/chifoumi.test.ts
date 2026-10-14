import { chifoumiRefusal, parseChifoumi } from "@vxv/server/domain/chifoumis";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["Chifoumi", "Sync"];
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

const CLICK = (frame: string, label: string) =>
  `FindWidget(${frame}, function(widget) return widget.label and widget.label.text == ${JSON.stringify(label)} and widget.shown ~= false end):Run("OnClick")`;
const SHOWN = (frame: string) => `return ${frame} ~= nil and ${frame}.shown == true`;
const run = (guild: Guild, name: string, code: string) =>
  guild.player(name).bundles.Chifoumi?.run(`local _, ns = ... ${code}`);

/** Thom, Vorn and Sira connected with VXV; Thom and Vorn with their companion. */
function startTrio(): Guild {
  const guild = startGuild([SIRA], { bundles: BUNDLES });
  guild.join(THOM, { written: companionFiles({}) });
  guild.join(VORN, { written: companionFiles({}) });
  settle(guild);
  return guild;
}

/** Both players play their move for the round, from their window. */
function round(guild: Guild, thom: string, vorn: string): void {
  guild.player(THOM).client(CLICK("VXV_ChifoumiWindow", thom));
  guild.player(VORN).client(CLICK("VXV_ChifoumiWindow", vorn));
  settle(guild, 1);
}

describe("Chi Fou Mi", () => {
  it("plays a game at the best of three, the moves hidden until both played, then takes it to the website", () => {
    const guild = startTrio();
    expect(run(guild, THOM, `return ns.Matches.Challenge("${VORN}", "100")`)).toBeUndefined();
    settle(guild);
    guild.player(VORN).client(CLICK("VXV_ChifoumiChallenge", "Accepter"));
    settle(guild, 1);
    // One line in the guild's chat, no window for the others; the players see their game.
    expect(guild.player(THOM).client("return ChatSent")).toContainEqual(
      expect.objectContaining({ text: expect.stringContaining(`Chi Fou Mi : ${THOM} contre ${VORN}`) }),
    );
    expect(guild.player(SIRA).client(SHOWN("VXV_ChifoumiWindow"))).toBe(false);
    expect(guild.player(VORN).client(SHOWN("VXV_ChifoumiWindow"))).toBe(true);
    const id = run(guild, SIRA, "return ns.Games.Live()[1].id") as string;
    // Sira watches from the tab and bets during the minute.
    expect(run(guild, SIRA, `return ns.Matches.Bet("${id}", "${THOM}", "50")`)).toBeUndefined();
    settle(guild, 1);
    settle(guild, 60);
    // The game redraws its window each frame: the bets closed, the moves show.
    for (const name of [THOM, VORN]) {
      guild.player(name).client('VXV_ChifoumiWindow:Run("OnUpdate", 1)');
    }

    // Thom plays first: the others only know he played.
    guild.player(THOM).client(CLICK("VXV_ChifoumiWindow", "Pierre"));
    settle(guild, 1);
    expect(
      run(guild, VORN, `local game = ns.Games.Find("${id}") return { game.locked["${THOM}"], game.moves["${THOM}"] }`),
    ).toEqual([true]);
    guild.player(VORN).client(CLICK("VXV_ChifoumiWindow", "Pierre"));
    settle(guild, 1);
    // A draw counts for nobody; then Thom's rock beats Vorn's scissors twice.
    round(guild, "Pierre", "Ciseaux");
    round(guild, "Pierre", "Ciseaux");
    for (const name of [THOM, VORN, SIRA]) {
      expect(
        run(guild, name, `local game = ns.Games.Find("${id}") return { #game.rounds, ns.Rules.Winner(game) }`),
      ).toEqual([3, THOM]);
    }
    const sent = parseChifoumi(guild.player(VORN).client(`return VXV_SyncDB.texts.chifoumi["${id}"]`) as string);
    expect(chifoumiRefusal(sent)).toBeUndefined();
    expect(sent.bets).toEqual([{ bettor: SIRA, choice: THOM, amount: 50 }]);
    // Vorn owes the stake: no new game until Thom confirms.
    expect(run(guild, VORN, `return ns.Matches.Challenge("${SIRA}", "0")`)).toBe(
      "Tu as une dette (paris, deathroll ou Chi Fou Mi) : règle-la pour jouer de nouveau.",
    );
    run(guild, THOM, `ns.Matches.ConfirmPaid("${id}")`);
    settle(guild, 1);
    expect(
      parseChifoumi(guild.player(THOM).client(`return VXV_SyncDB.texts.chifoumi["${id}"]`) as string).paid?.by,
    ).toBe(THOM);
    expect(run(guild, VORN, `return ns.Matches.Challenge("${SIRA}", "0")`)).toBeUndefined();
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("shows Le Dé Pipé's three tabs, Chi Fou Mi last, with its challenge at 0 po by default", () => {
    const { client, errors } = startCore({ bundles: ["Chifoumi", "Paris"] });
    client(`SlashCmdList.VXV("")
      FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Le Dé Pipé" end):Run("OnClick")`);
    client(
      `FindWidget(VXV_Window, function(widget) return widget.SetSelected and widget.label and widget.label.text == "Chi Fou Mi" end):Run("OnClick")`,
    );
    expect(
      client(
        `return IsVisible(FindWidget(VXV_Window, function(widget) return widget.label and widget.label.text == "Défier" end))`,
      ),
    ).toBe(true);
    expect(errors()).toEqual([]);
  });
});
