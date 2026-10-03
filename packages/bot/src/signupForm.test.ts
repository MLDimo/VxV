import type { PGliteInterface } from "@electric-sql/pglite";
import type { Application, Character, Member } from "@vxv/server";
import type { FakeDiscord } from "@vxv/server/testing";
import {
  ComponentType,
  InteractionResponseType,
  type APIInteractionResponse,
  type APIModalInteractionResponseCallbackData,
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

function contentOf(response: APIInteractionResponse): string | undefined {
  return "data" in response && response.data !== undefined && "content" in response.data
    ? response.data.content
    : undefined;
}

/** The value of each field of a form: the default option of a select, or the prefilled text. */
function prefilled(form: APIModalInteractionResponseCallbackData): Record<string, string | undefined> {
  return Object.fromEntries(
    form.components.flatMap((container) => {
      if (container.type !== ComponentType.Label) {
        return [];
      }
      const field = container.component;
      if (field.type === ComponentType.StringSelect) {
        return [[field.custom_id, field.options.find((option) => option.default)?.label]];
      }
      return field.type === ComponentType.TextInput ? [[field.custom_id, field.value ?? field.placeholder]] : [];
    }),
  );
}

describe("sign-up by Discord buttons", () => {
  let database: PGliteInterface;
  let app: Application;
  let discord: FakeDiscord;
  let context: BotContext;
  let eventId: string;
  let deja: Character;

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

  const identifyMe = (): Promise<Member> => app.auth.identify({ discordId: ME.userId, discordName: ME.name }, []);
  const open = (actor = ME) =>
    openSignupForm(buttonClick(`${SIGNUP_BUTTON_PREFIX}${eventId}`, actor), context, eventId);
  const formOf = (response: APIInteractionResponse) => {
    expect(response.type).toBe(InteractionResponseType.Modal);
    return (response as { data: APIModalInteractionResponseCallbackData }).data;
  };
  const send = (selects: Record<string, string>, spec: string) =>
    submitSignupForm(
      formSubmission(`${SIGNUP_FORM_PREFIX}${eventId}`, { selects, texts: { spec } }, ME),
      context,
      eventId,
    );

  it("opens a form with the main chosen, present by default, and spec suggestions for the class", async () => {
    const form = formOf(await open());
    expect(form.title).toBe("Inscription · Onyxia");
    expect(prefilled(form)).toEqual({
      character: "Ðéjà Vu · Voleur",
      role: undefined,
      status: "Présent",
      spec: "ex. Assassinat, Combat, Finesse",
    });
  });

  it("saves the sign-up like the website, and updates the raid's message", async () => {
    const reply = await send({ character: deja.id, role: "dps", status: "late" }, "Combat");
    expect(contentOf(reply)).toBe("Inscription enregistrée : Ðéjà Vu, DPS (Combat), En retard.");
    expect(await app.signups.findMine(await identifyMe(), eventId)).toMatchObject({ role: "dps", status: "late" });
    expect(JSON.stringify(discord.messages()[0]?.body)).toContain("Ðéjà Vu (Combat) ⏰");
  });

  it("fills the form with the current sign-up when the member comes back", async () => {
    await send({ character: deja.id, role: "tank", status: "maybe" }, "Protection");
    expect(prefilled(formOf(await open()))).toEqual({
      character: "Ðéjà Vu · Voleur",
      role: "🛡️ Tank",
      status: "Peut-être",
      spec: "Protection",
    });
  });

  it("tells a member without character to link one first", async () => {
    expect(contentOf(await open(NEWCOMER))).toBe(
      `Lie d'abord ton personnage avec /vxv_main dans <#${LINK_CHANNEL}>, puis inscris-toi.`,
    );
  });

  it("refuses an incomplete form with the website's message", async () => {
    await expect(send({ character: deja.id, role: "dps", status: "present" }, "  ")).rejects.toThrow(
      /Indiquez votre spécialisation/,
    );
  });
});
