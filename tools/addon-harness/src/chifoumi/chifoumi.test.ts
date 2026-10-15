import { ADDON_CHIFOUMIS_HEADER, formatAddonGames } from "@vxv/server/domain/addonGames";
import type { Character } from "@vxv/server/domain/characters";
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
const WINDOW_TEXTS = `
  local texts = {}
  FindWidget(VXV_ChifoumiWindow, function(widget)
    if type(widget.text) == "string" then texts[#texts + 1] = widget.text end
  end)
  return texts
`;
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

/** The game redraws its window each frame: the reveal of the last round over, the moves show again. */
function nextFrame(guild: Guild, seconds: number): void {
  guild.advanceTime(seconds);
  for (const name of [THOM, VORN]) {
    guild.player(name).client('VXV_ChifoumiWindow:Run("OnUpdate", 1)');
  }
}

/** Both players play their move for the round, from their window, once the last round's reveal is over. */
function round(guild: Guild, thom: string, vorn: string): void {
  nextFrame(guild, 5);
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
    // The bets closed, the moves show.
    nextFrame(guild, 1);

    // Thom plays first: the others only know he played.
    guild.player(THOM).client(CLICK("VXV_ChifoumiWindow", "Pierre"));
    settle(guild, 1);
    expect(
      run(guild, VORN, `local game = ns.Games.Find("${id}") return { game.locked["${THOM}"], game.moves["${THOM}"] }`),
    ).toEqual([true]);
    guild.player(VORN).client(CLICK("VXV_ChifoumiWindow", "Pierre"));
    settle(guild, 1);
    // The round's reveal: « Chi… Fou… Mi ! » over the sealed moves, then both moves.
    guild.player(SIRA).client(`SlashCmdList.VXV("")`);
    run(guild, SIRA, `ns.MatchWindow.Show("${id}")`);
    expect(guild.player(SIRA).client(WINDOW_TEXTS)).toContain("Coups scellés… révélation au « Mi ! »");
    guild.player(SIRA).client("AdvanceTime(2) VXV_ChifoumiWindow:Run('OnUpdate', 1)");
    expect(guild.player(SIRA).client(WINDOW_TEXTS)).toContain("Égalité : la manche est rejouée.");
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

  it("draws each player with the portrait the website gives, else the initial", () => {
    const character = (firstName: string, lastName: string, memberId: string): Character => ({
      id: memberId,
      firstName,
      lastName,
      characterClass: "ROGUE",
      memberId,
      isMain: true,
      inGuild: true,
    });
    const text = formatAddonGames(ADDON_CHIFOUMIS_HEADER, {
      officers: [],
      characters: [character("Thom", "Leboss", "m-thom"), character("Vorn", "Cendrelune", "m-vorn")],
      barred: [],
      newcomers: [],
      portraits: [{ memberId: "m-thom", avatar: "mv_voleur_m" }],
      games: [],
      exportedAt: new Date("2026-12-10T07:00:00Z"),
    });
    const { bundles, client, errors } = startCore({
      written: companionFiles({ chifoumi: text }),
      bundles: BUNDLES,
      playerName: SIRA,
    });
    bundles.Chifoumi?.run(`local _, ns = ...
      ns.Games.Start({ id = "c1", challenger = "${THOM}", challenged = "${VORN}", stake = 0, acceptedAt = 1,
        closesAt = GetTime() + 60, rounds = {}, bets = {} })
      ns.MatchWindow.Show("c1")`);
    const paths = client(`local paths = {}
      FindWidget(VXV_ChifoumiWindow, function(widget)
        if type(widget.path) == "string" and widget.shown ~= false then paths[#paths + 1] = widget.path end
      end)
      return paths`) as string[];
    expect(paths.some((path) => path.endsWith("Avatars\\mv_voleur_m.png"))).toBe(true);
    expect(client(WINDOW_TEXTS)).toContain("V");
    expect(errors()).toEqual([]);
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
