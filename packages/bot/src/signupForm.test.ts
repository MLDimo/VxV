import type { PGliteInterface } from "@vxv/database/testing";
import type { Application, Character, Member } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import {
  ComponentType,
  InteractionResponseType,
  type APIInteractionResponse,
  type APIModalInteractionResponseCallbackData,
  type APISelectMenuOption,
} from "discord-api-types/v10";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotContext } from "./commands.ts";
import { SIGNUP_BUTTON_PREFIX } from "./raidMessage.ts";
import { openSignupForm, SIGNUP_FORM_PREFIX, submitSignupForm } from "./signupForm.ts";
import { createTestApplication, LINK_CHANNEL, TEST_ROLES } from "./testApplication.ts";
import { buttonClick, formSubmission, type TestActor } from "./testing.ts";

const ME: TestActor = { userId: "200", name: "Déjà", channelId: "raids" };
const NEWCOMER: TestActor = { userId: "300", name: "Nouveau", channelId: "raids" };
const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const WRONG_CLASS = "Cette spécialisation n'est pas celle de la classe du personnage choisi : choisis-en une autre.";

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

/** The options of each select menu of a form, by field. */
function selects(form: APIModalInteractionResponseCallbackData): Record<string, APISelectMenuOption[]> {
  return Object.fromEntries(
    form.components.flatMap((container) =>
      container.type === ComponentType.Label && container.component.type === ComponentType.StringSelect
        ? [[container.component.custom_id, container.component.options]]
        : [],
    ),
  );
}

/** The option chosen in advance in each select menu. */
function prefilled(form: APIModalInteractionResponseCallbackData): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(selects(form)).map(([field, options]) => [field, options.find((option) => option.default)?.label]),
  );
}

describe("sign-up by Discord buttons", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;
  let eventId: string;
  let deja: Character;

  const identifyMe = (): Promise<Member> => app.auth.identify({ discordId: ME.userId, discordName: ME.name }, []);

  beforeEach(async () => {
    ({ app, database, discord, context } = await createTestApplication(["Ðéjà;Vu;ROGUE", "Eole;Hermes;DRUID"]));
    await database.exec("insert into raids (id, name, instance_id) values ('onyxia', 'Onyxia', 249)");
    const officer = await app.auth.identify({ discordId: "100", discordName: "Officier" }, [TEST_ROLES.officer]);
    eventId = await app.events.createEvent(
      officer,
      { startsAt: new Date(`${NEXT_YEAR}-12-12T20:00:00Z`), raidIds: ["onyxia"], softReservesPerPlayer: 1 },
      "Raid de test",
    );
    await app.raidAnnouncements.announce(eventId);
    const me = await identifyMe();
    const characters = await app.characters.listAvailable();
    deja = characters.find((character) => character.firstName === "Ðéjà") as Character;
    const eole = characters.find((character) => character.firstName === "Eole") as Character;
    await app.characters.link(me, eole.id, false);
    await app.characters.link(me, deja.id, true);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.close();
  });

  const open = async (actor = ME) =>
    openSignupForm(buttonClick(`${SIGNUP_BUTTON_PREFIX}${eventId}`, actor), context, eventId);
  const formOf = (response: APIInteractionResponse) => {
    expect(response.type).toBe(InteractionResponseType.Modal);
    return (response as { data: APIModalInteractionResponseCallbackData }).data;
  };
  /** Sends the form with the given choices; "spec" is the value of a spec option. */
  const send = async (choices: { role: string; status: string; spec: string }) =>
    contentOf(
      await submitSignupForm(
        formSubmission(
          `${SIGNUP_FORM_PREFIX}${eventId}`,
          { selects: { character: deja.id, ...choices }, texts: {} },
          ME,
        ),
        context,
        eventId,
      ),
    );

  it("opens a form with the main chosen, present by default, and the specs of the member's classes", async () => {
    const form = formOf(await open());
    expect(form.title).toBe("Inscription · Onyxia");
    expect(prefilled(form)).toEqual({
      character: "Ðéjà Vu · Voleur",
      role: undefined,
      status: "Présent",
      spec: undefined,
    });
    expect(selects(form).spec?.map((option) => option.label)).toEqual([
      "Assassinat · Voleur",
      "Combat · Voleur",
      "Finesse · Voleur",
      "Équilibre · Druide",
      "Combat farouche · Druide",
      "Restauration · Druide",
    ]);
  });

  it("saves the sign-up like the website, and updates the raid's message", async () => {
    expect(await send({ role: "dps", status: "late", spec: "ROGUE|Combat" })).toBe(
      "Inscription enregistrée : Ðéjà Vu, DPS (Combat), En retard.",
    );
    expect(await app.signups.findMine(await identifyMe(), eventId)).toMatchObject({ role: "dps", spec: "Combat" });
    expect(JSON.stringify(discord.messages()[0]?.body)).toContain("Ðéjà Vu (Combat) ⏰");
  });

  it("fills the form with the current sign-up when the member comes back", async () => {
    await send({ role: "tank", status: "maybe", spec: "ROGUE|Finesse" });
    expect(prefilled(formOf(await open()))).toEqual({
      character: "Ðéjà Vu · Voleur",
      role: "🛡️ Tank",
      status: "Peut-être",
      spec: "Finesse · Voleur",
    });
  });

  it("keeps a spec typed on the website, outside the usual ones", async () => {
    await app.signups.signUp(await identifyMe(), eventId, {
      characterId: deja.id,
      role: "dps",
      spec: "Dagues",
      status: "present",
    });
    expect(prefilled(formOf(await open())).spec).toBe("Dagues");
    expect(await send({ role: "dps", status: "present", spec: "|Dagues" })).toBe(
      "Inscription enregistrée : Ðéjà Vu, DPS (Dagues), Présent.",
    );
  });

  it("refuses a spec of another class than the chosen character's", async () => {
    expect(await send({ role: "healer", status: "present", spec: "DRUID|Restauration" })).toBe(WRONG_CLASS);
    expect(await app.signups.findMine(await identifyMe(), eventId)).toBeUndefined();
  });

  it("tells a member without character to link one first", async () => {
    expect(contentOf(await open(NEWCOMER))).toBe(
      `Lie d'abord ton personnage avec /vxv_main dans <#${LINK_CHANNEL}>, puis inscris-toi.`,
    );
  });

  it("refuses a form without spec with the website's message", async () => {
    await expect(send({ role: "dps", status: "present", spec: "" })).rejects.toThrow(/Indiquez votre spécialisation/);
  });
});
