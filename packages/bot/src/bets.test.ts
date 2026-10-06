import type { PGliteInterface } from "@electric-sql/pglite";
import type { Application } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import {
  ComponentType,
  InteractionResponseType,
  type APIEmbed,
  type APIInteractionResponse,
  type APIModalInteractionResponseCallbackData,
} from "discord-api-types/v10";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VXV_PARI } from "./betCommand.ts";
import { BET_FORM_PREFIX, openBetForm, submitBetForm, withdrawStake } from "./betForm.ts";
import { BET_BUTTON_PREFIX, BET_WITHDRAW_PREFIX, betMessage } from "./betMessage.ts";
import type { BotContext } from "./commands.ts";
import { BETS_CHANNEL, createTestApplication, SITE_URL, TEST_ROLES } from "./testApplication.ts";
import { buttonClick, formSubmission, slashCommand, type TestActor } from "./testing.ts";

const OFFICER: TestActor = { userId: "100", name: "Officier", roleIds: [TEST_ROLES.officer], channelId: "anywhere" };
const MEMBER: TestActor = { userId: "200", name: "Membre", channelId: BETS_CHANNEL };
const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const BET = {
  titre: "Qui meurt en premier sur le boss 10 ?",
  choix: "Un tank ; Un heal ; Un DPS",
  date: `12/12/${String(NEXT_YEAR)}`,
  heure: "21:00",
  motif: "Pour le raid",
};

/** French typography keeps numbers and units together with no-break spaces. */
const plain = (text: string | undefined) => text?.replace(/\s/gu, " ");

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? plain(response.data.content)
    : undefined;
}

describe("bets on Discord", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication(["Ðéjà;Vu;ROGUE"]));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const open = async (options: Record<string, string> = BET, actor = OFFICER) =>
    contentOf(await VXV_PARI.run(slashCommand("vxv_pari", options, actor), context));
  const embed = () => (discord.messages()[0]?.body.embeds as APIEmbed[] | undefined)?.[0];
  const betId = async () => (await app.bets.list())[0]?.bet.id ?? "";
  const choiceId = async (label: string) =>
    (await app.bets.list())[0]?.bet.choices.find((choice) => choice.label === label)?.id ?? "";
  const stake = async (actor: TestActor, label: string, amount: string) =>
    contentOf(
      await submitBetForm(
        formSubmission(
          `${BET_FORM_PREFIX}${await betId()}`,
          { selects: { choice: await choiceId(label) }, texts: { amount } },
          actor,
        ),
        context,
        await betId(),
      ),
    );

  it("lets an officer open a bet, published in the bets channel with its choices and the buttons", async () => {
    expect(await open()).toBe(`Pari ouvert et publié dans <#${BETS_CHANNEL}>.`);
    const [message] = discord.messages();
    expect(message?.channelId).toBe(BETS_CHANNEL);
    expect(embed()?.title).toBe(`🎲 ${BET.titre}`);
    expect(embed()?.url).toBe(`${SITE_URL}/paris/${await betId()}`);
    expect(embed()?.fields?.map((field) => [field.name, field.value])).toEqual([
      ["Un tank · —", "Aucune mise"],
      ["Un heal · —", "Aucune mise"],
      ["Un DPS · —", "Aucune mise"],
    ]);
    expect(JSON.stringify(message?.body.components)).toContain(`${BET_BUTTON_PREFIX}${await betId()}`);
    expect(JSON.stringify(message?.body.components)).toContain(`${BET_WITHDRAW_PREFIX}${await betId()}`);
  });

  it("refuses a bet from a member, a single choice and an invalid closing date", async () => {
    await expect(open(BET, MEMBER)).rejects.toThrow("Cette action est réservée aux officiers.");
    await expect(open({ ...BET, choix: "Oui" })).rejects.toThrow(/de 2 à 10 choix/);
    expect(await open({ ...BET, date: "31/02" })).toMatch(/^Date ou heure de fermeture invalide/);
    expect(await app.bets.list()).toEqual([]);
  });

  it("opens the stake form filled with the member's stake, then takes the stake and shows the new odds", async () => {
    await open();
    const form = await openBetForm(buttonClick(`${BET_BUTTON_PREFIX}${await betId()}`, MEMBER), context, await betId());
    expect(form.type).toBe(InteractionResponseType.Modal);
    expect(await stake(OFFICER, "Un heal", "150")).toMatch(/^Ta mise : 150 po sur « Un heal » → gain possible 150 po/);
    expect(await stake(MEMBER, "Un tank", " 50 ")).toBe(
      "Ta mise : 50 po sur « Un tank » → gain possible 180 po (× 3,60 pour l'instant : les cotes bougent " +
        "jusqu'à la fermeture). À payer au trésorier ; modifiable tant qu'elle n'est pas payée.",
    );
    expect(embed()?.fields?.map((field) => [plain(field.name), plain(field.value)])).toEqual([
      ["Un tank · × 3,60", "25 % · 50 po · 1 parieur"],
      ["Un heal · × 1,20", "75 % · 150 po · 1 parieur"],
      ["Un DPS · —", "Aucune mise"],
    ]);
    expect(plain(embed()?.description)).toContain("💰 Cagnotte 200 po · 2 parieurs · 10 % pour la caisse de la guilde");
    const again = await openBetForm(
      buttonClick(`${BET_BUTTON_PREFIX}${await betId()}`, MEMBER),
      context,
      await betId(),
    );
    const data = (again as { data: APIModalInteractionResponseCallbackData }).data;
    const [choice, amount] = data.components.map((container) =>
      container.type === ComponentType.Label ? container.component : undefined,
    );
    expect(choice?.type === ComponentType.StringSelect && choice.options.find((option) => option.default)?.label).toBe(
      "Un tank",
    );
    expect(amount?.type === ComponentType.TextInput && amount.value).toBe("50");
  });

  it("refuses a stake that is not a whole number of gold pieces", async () => {
    await open();
    await expect(stake(MEMBER, "Un tank", "beaucoup")).rejects.toThrow(/1 po au moins/);
    await expect(stake(MEMBER, "Un tank", "0")).rejects.toThrow(/1 po au moins/);
  });

  it("takes a stake back with the button", async () => {
    await open();
    await stake(MEMBER, "Un tank", "50");
    const response = await withdrawStake(
      buttonClick(`${BET_WITHDRAW_PREFIX}${await betId()}`, MEMBER),
      context,
      await betId(),
    );
    expect(contentOf(response)).toBe("Mise retirée.");
    expect(embed()?.fields?.[0]?.value).toBe("Aucune mise");
  });

  it("drops the buttons and shows the bet closed once the closing time is past", async () => {
    await open();
    const found = await app.bets.find(await betId());
    if (found === undefined) {
      throw new Error("the bet was not opened");
    }
    const closed = betMessage({ bet: found.bet, stakes: found.stakes, open: false }, SITE_URL);
    expect(closed.components).toEqual([]);
    expect(closed.embeds?.[0]?.description).toMatch(/^🔒 Fermé depuis/);
  });
});
