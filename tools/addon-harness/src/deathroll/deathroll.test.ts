import { ADDON_CHIFOUMIS_HEADER, ADDON_DEATHROLLS_HEADER } from "@vxv/server/domain/addonGames";
import { deathrollRefusal, parseDeathroll } from "@vxv/server/domain/deathrolls";
import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";
import { diceGamesData, memberOf } from "../diceGames/fixtures.ts";
import { companionFiles } from "../sync/fixtures.ts";

const BUNDLES = ["Deathroll", "Sync"];
const THOM = "Thom Leboss";
const ANNOUNCEMENT =
  "[VXV] Deathroll : Thom Leboss contre Vorn Cendrelune pour 500 po, départ 1000. Paris ouverts 30 s dans l'addon.";
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

const IN_DEBT = "Tes dettes atteignent la limite (paris, deathroll, Chi Fou Mi) : règles-en pour jouer de nouveau.";

/** Thom, Vorn and Sira connected with VXV; Thom and Vorn with their companion, which brought the website's data. */
function startTrio(): Guild {
  const guild = startGuild([SIRA], { bundles: BUNDLES });
  const written = companionFiles({ deathroll: diceGamesData(ADDON_DEATHROLLS_HEADER) });
  guild.join(THOM, { written });
  guild.join(VORN, { written });
  settle(guild);
  return guild;
}

/** Thom challenges Vorn for 500 po from 1000; Vorn accepts. Returns the game's id. */
function challengeAndAccept(guild: Guild): string {
  const thom = guild.player(THOM);
  expect(
    thom.bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${VORN}", "500", "1000")`),
  ).toBeUndefined();
  settle(guild);
  guild.player(VORN).client(CLICK("VXV_DeathrollChallenge", "Accepter"));
  settle(guild, 1);
  return guild.player(SIRA).bundles.Deathroll?.run(`local _, ns = ... return ns.Games.Live()[1].id`) as string;
}

/** The player rolls with the button, and the game's server answers the roll in the chat; then, before the clocks move,
 * watch(). */
function roll(guild: Guild, name: string, high: number, result: number, watch = () => undefined): void {
  const player = guild.player(name);
  // The previous roll's digits have scrolled: the button shows again.
  player.client(
    `AdvanceTime(2) VXV_DuelWindow:Run("OnUpdate", 0.1) ${CLICK("VXV_DuelWindow", `Roll (0-${String(high)})`)}`,
  );
  expect(player.client("return Rolled[#Rolled]")).toEqual({ low: 0, high });
  player.client(`Fire("CHAT_MSG_SYSTEM", "${name} obtient un ${String(result)} (0-${String(high)}).")`);
  guild.deliver();
  watch();
  settle(guild, 1);
}

describe("the deathroll in game (P15)", () => {
  it("plays a game to the end with the buttons: challenge, bets, rolls, and the loser's debt", () => {
    const guild = startTrio();
    const id = challengeAndAccept(guild);
    // The guild hears it in its chat (P15.2); the players see their window.
    // Vorn's click on « Accepter » sends it: the game sends a guild message only from a click.
    expect(guild.player(VORN).client("return ChatSent")).toEqual([{ text: ANNOUNCEMENT, channel: "GUILD" }]);
    expect(guild.player(VORN).client("return VXV_DuelWindow.shown")).toBe(true);
    // The announcement's link opens the game for a member who watches.
    const shown = guild
      .player(SIRA)
      .client(`return ChatShows("CHAT_MSG_GUILD", ${JSON.stringify(ANNOUNCEMENT)}, "${THOM}")`) as string;
    expect(shown).toContain("|h[Regarder]|h");
    guild.player(SIRA).client(`ClickChatLink(${JSON.stringify(shown)})`);
    expect(guild.player(SIRA).client("return VXV_DuelWindow.shown")).toBe(true);
    // The games being played show at a glance in the tab, with where they stand.
    const tabRows = guild.player(SIRA).client(`SlashCmdList.VXV("")
      FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Le Dé Pipé" end):Run("OnClick")
      local texts = {}
      FindWidget(VXV_Window, function(widget)
        if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
      end)
      return texts`) as string[];
    expect(plain(tabRows)).toEqual(
      expect.arrayContaining([
        `EN DIRECT  ${THOM} contre ${VORN} · 500 po`,
        expect.stringMatching(/^ {4}Paris ouverts encore \d+ s, puis Vorn Cendrelune roll de 0 à 1000\.$/),
      ]),
    );
    // Sira bets during the minute; a player may not.
    const sira = guild.player(SIRA);
    expect(
      sira.bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Bet("${id}", "${THOM}", "100")`),
    ).toBeUndefined();
    expect(
      guild.player(THOM).bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Bet("${id}", "${THOM}", "100")`),
    ).toBe("Les joueurs ne parient pas sur leur partie.");
    settle(guild, 1);
    // No roll during the minute of bets.
    expect(
      guild
        .player(VORN)
        .client(
          `return IsVisible(FindWidget(VXV_DuelWindow, function(widget) return widget.label and widget.label.text == "Roll (0-1000)" end))`,
        ),
    ).toBe(false);
    guild.advanceTime(31);
    roll(guild, VORN, 1000, 412);
    roll(guild, THOM, 412, 87, () => {
      // Sira watches: while the digits scroll, the window tells the roll being drawn, not its result.
      const texts = plain(guild.player(SIRA).client(DUEL_TEXTS));
      expect(texts).toContain("Thom Leboss roll de 0 à 412…");
      expect(texts).toContain("1000 → 412");
      guild.player(SIRA).client("for _ = 1, 40 do AdvanceTime(0.1) VXV_DuelWindow:Run('OnUpdate', 0.1) end");
      expect(plain(guild.player(SIRA).client(DUEL_TEXTS))).toContain("1000 → 412 → 87");
    });
    // A roll out of turn is not the game's.
    guild.player(THOM).client(`Fire("CHAT_MSG_SYSTEM", "${THOM} obtient un 5 (0-87).")`);
    settle(guild, 1);
    roll(guild, VORN, 87, 0);
    for (const name of [THOM, VORN, SIRA]) {
      const game = guild.player(name).bundles.Deathroll?.run(LAST_GAME(id)) as { rolls: unknown[] };
      expect(game.rolls).toHaveLength(3);
    }
    guild.player(VORN).client("for _ = 1, 40 do AdvanceTime(0.1) VXV_DuelWindow:Run('OnUpdate', 0.1) end");
    expect(plain(guild.player(VORN).client(DUEL_TEXTS))).toEqual(
      expect.arrayContaining(["Vorn Cendrelune a fait 0 : Thom Leboss gagne 500 po.", "VICTOIRE", "A goûté le sol"]),
    );
    // The reduced window keeps the number, the turn and the result; the player's choice stays.
    guild
      .player(VORN)
      .client(
        `FindWidget(VXV_DuelWindow, function(widget) return widget.label and widget.label.text == "-" end):Run("OnClick")`,
      );
    expect(guild.player(VORN).client("return VXV_DuelWindow.width")).toBe(380);
    guild.player(VORN).client("VXV_DuelWindow:Hide()");
    guild.player(VORN).bundles.Deathroll?.run(`local _, ns = ... ns.DuelWindow.Show("${id}")`);
    expect(guild.player(VORN).client("return VXV_DuelWindow.width")).toBe(380);
    // The players' companions take it to the website, which reads it within the rules.
    const sent = parseDeathroll(guild.player(VORN).client(`return VXV_SyncDB.texts.deathroll["${id}"]`) as string);
    expect(deathrollRefusal(sent)).toBeUndefined();
    expect(sent.bets).toEqual([{ bettor: SIRA, choice: THOM, amount: 100 }]);
    // Vorn owes the stake: no new challenge until Thom confirms.
    expect(
      guild.player(VORN).bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${SIRA}", "10", "100")`),
    ).toBe(IN_DEBT);
    guild.player(THOM).bundles.Deathroll?.run(`local _, ns = ... ns.Duels.ConfirmPaid({ "${id}" })`);
    settle(guild, 1);
    const paid = parseDeathroll(guild.player(THOM).client(`return VXV_SyncDB.texts.deathroll["${id}"]`) as string);
    expect(paid.paid?.by).toBe(THOM);
    // Paid, the debt stays in the history, and Vorn plays again.
    expect(
      guild.player(VORN).bundles.Deathroll?.run(`local _, ns = ... return ns.Debts.History("${VORN}")[1].paid`),
    ).toBe(true);
    expect(
      guild.player(VORN).bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${SIRA}", "10", "100")`),
    ).toBeUndefined();
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("sends one challenge at a time: another waits for its answer, or the end of its minute", () => {
    const guild = startTrio();
    const challenge = (target: string) =>
      guild
        .player(THOM)
        .bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${target}", "10", "100")`);
    expect(challenge(VORN)).toBeUndefined();
    expect(challenge(SIRA)).toBe("Ton défi à Vorn Cendrelune attend sa réponse encore 60 s.");
    guild.advanceTime(61);
    expect(challenge(SIRA)).toBeUndefined();
    // Answered (refused), the challenge leaves room for another at once.
    settle(guild);
    guild.player(SIRA).client(CLICK("VXV_DeathrollChallenge", "Refuser"));
    settle(guild, 1);
    expect(challenge(VORN)).toBeUndefined();
  });

  it("shows a challenge received during a fight once it is over, while there is time left to answer it", () => {
    const guild = startTrio();
    const shown = (name: string) =>
      guild.player(name).client("return VXV_DeathrollChallenge ~= nil and VXV_DeathrollChallenge.shown == true");
    const challenge = (target: string) =>
      guild
        .player(THOM)
        .bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${target}", "10", "100")`);
    guild.player(VORN).client("InCombat = true");
    challenge(VORN);
    settle(guild, 1);
    expect(shown(VORN)).toBe(false);
    guild.player(VORN).client("InCombat = false");
    settle(guild, 1);
    expect(shown(VORN)).toBe(true);
    // A fight longer than the minute to answer: the challenge lapses unseen.
    guild.player(SIRA).client("InCombat = true");
    challenge(SIRA);
    settle(guild, 1);
    guild.advanceTime(70);
    guild.player(SIRA).client("InCombat = false");
    settle(guild, 1);
    expect(shown(SIRA)).toBe(false);
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("refuses a challenge to a member who owes the website's limit, not to one who owes less", () => {
    const challenge = (owed: number) => {
      const text = diceGamesData(ADDON_DEATHROLLS_HEADER, { debts: [{ memberId: memberOf(VORN), owed }] });
      const { bundles, errors } = startCore({ written: companionFiles({ deathroll: text }), bundles: BUNDLES });
      const answer = bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${VORN}", "10", "100")`);
      expect(errors()).toEqual([]);
      return answer;
    };
    expect(challenge(100)).toBe("Vorn Cendrelune a trop de dettes : pas de deathroll avant qu'il en règle.");
    expect(challenge(99)).toBeUndefined();
  });

  it("sends again at each start the games over kept, for a companion that missed them", () => {
    const guild = startTrio();
    const id = challengeAndAccept(guild);
    guild.advanceTime(31);
    roll(guild, VORN, 1000, 0);
    const thom = guild.player(THOM);
    thom.client(`VXV_SyncDB.texts.deathroll["${id}"] = nil`);
    thom.bundles.Deathroll?.run(`local _, ns = ... ns.Games.Resend()`);
    expect(parseDeathroll(thom.client(`return VXV_SyncDB.texts.deathroll["${id}"]`) as string).id).toBe(id);
  });

  it("keeps the members without the role Membre on Discord out of the deathrolls, either way", () => {
    const text = diceGamesData(ADDON_DEATHROLLS_HEADER, { newcomers: [memberOf(VORN)] });
    const challenge = (playerName: string, target: string) => {
      const { bundles, errors } = startCore({
        written: companionFiles({ deathroll: text }),
        bundles: BUNDLES,
        playerName,
      });
      const answer = bundles.Deathroll?.run(`local _, ns = ... return ns.Duels.Challenge("${target}", "10", "100")`);
      expect(errors()).toEqual([]);
      return answer;
    };
    expect(challenge(THOM, VORN)).toBe("Vorn Cendrelune n'a pas le rôle Membre sur Discord : pas de deathroll.");
    expect(challenge(VORN, THOM)).toBe("Paris, deathroll et Chi Fou Mi sont réservés au rôle Membre sur Discord.");
  });

  it("finds the member to challenge by a part of their name, accents and case aside", () => {
    const guild = startTrio();
    const sira = guild.player(SIRA);
    sira.client(`SlashCmdList.VXV("")
      FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Le Dé Pipé" end):Run("OnClick")
      local field = FindWidget(VXV_Window, function(widget) return widget.maxLetters == 40 and IsVisible(widget) end)
      field:SetText("CENDRÉ")
      field:Run("OnTextChanged")`);
    const rows = () =>
      sira.client(`local texts = {}
        FindWidget(VXV_Window, function(widget)
          if widget.row ~= nil and widget.shown and IsVisible(widget) then texts[#texts + 1] = widget.label.text end
        end)
        return texts`) as string[];
    expect(plain(rows())).toContain(VORN);
    expect(plain(rows())).not.toContain(THOM);
    sira.client(
      `FindWidget(VXV_Window, function(widget) return widget.row ~= nil and widget.label.text == "${VORN}" end):Run("OnMouseUp", "LeftButton")`,
    );
    expect(plain(rows())).toContain(`» ${VORN}`);
    // Vorn logs off: the guild's list says so, and he leaves the list.
    sira.client(`MockGuildMembers = { { name = "${VORN}", class = "MAGE", online = false } }
      local field = FindWidget(VXV_Window, function(widget) return widget.maxLetters == 40 and IsVisible(widget) end)
      field:Run("OnTextChanged")`);
    expect(plain(rows())).toContain("Aucun membre connecté ne correspond.");
    for (const player of guild.players) {
      expect(player.errors()).toEqual([]);
    }
  });

  it("tells the latest games in the Journal, the deathrolls and the Chi Fou Mi together", () => {
    const game = (id: string, winner: string, loser: string, stake: number, at: string) => ({
      id,
      winner: { memberId: memberOf(winner), name: winner },
      loser: { memberId: memberOf(loser), name: loser },
      stake,
      endedAt: new Date(at),
      paid: false,
    });
    const { client, errors } = startCore({
      bundles: ["Raid", "Deathroll", "Chifoumi", "Sync"],
      written: companionFiles({
        deathroll: diceGamesData(ADDON_DEATHROLLS_HEADER, {
          games: [game("d1", THOM, VORN, 500, "2026-12-09T21:00:00Z")],
        }),
        chifoumi: diceGamesData(ADDON_CHIFOUMIS_HEADER, {
          games: [game("c1", SIRA, THOM, 0, "2026-12-09T22:00:00Z")],
        }),
      }),
    });
    client(`SlashCmdList.VXV("")
      FindWidget(VXV_Window.header, function(widget) return widget.SetSelected and widget.label.text == "Journal" end):Run("OnClick")`);
    const rows = client(`local texts = {}
      FindWidget(VXV_Window, function(widget)
        if widget.row ~= nil and widget.shown then texts[#texts + 1] = widget.label.text end
      end)
      return texts`) as string[];
    expect(rows.slice(rows.indexOf("Le Dé Pipé"))).toEqual([
      "Le Dé Pipé",
      expect.stringMatching(/^Chi Fou Mi · Sira Ventargent bat Thom Leboss · 0 po · \d\d\/12$/),
      expect.stringMatching(/^Deathroll · Thom Leboss bat Vorn Cendrelune · 500 po · \d\d\/12$/),
    ]);
    expect(errors()).toEqual([]);
  });

  it("shows Le Dé Pipé's two tabs, Paris then Deathroll", () => {
    const { client } = startCore({ bundles: ["Deathroll", "Paris"] });
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
