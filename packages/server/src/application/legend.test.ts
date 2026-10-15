import type { PGliteInterface } from "@vxv/database/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExploitProposal } from "../domain/legend.ts";
import type { Member } from "../domain/members.ts";
import { characterRepository } from "../infrastructure/postgres/characters.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import {
  createEvent,
  createGuildCharacters,
  createMember,
  createRaidWithLoot,
  recordAttendance,
} from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { createJournal } from "./journal.ts";
import { createLegend, type Legend } from "./legend.ts";

const NOW = new Date("2026-10-15T12:00:00Z");

const proposal = (change: Partial<ExploitProposal> = {}): ExploitProposal => ({
  title: "Ragnaros tombe : premier clear",
  occurredOn: "2026-09-03",
  occurredTime: "23:38",
  place: "Cœur du Magma",
  category: "raid",
  story: "Sept soirées de raid, et Ragnaros tombe enfin au 9e essai.",
  quote: "NE BOUGEZ PLUS.",
  quoteBy: "Ulric",
  stats: ["9e essai", "63 wipes"],
  eventId: undefined,
  ...change,
});
const capture = { contentType: "image/png", bytes: new Uint8Array([137, 80, 78, 71]) };

describe("Hall of Fame", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let legend: Legend;
  let journal: ReturnType<typeof createJournal>;
  let officer: Member;
  let thom: Member;
  let sira: Member;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    const unitOfWork = createUnitOfWork(sql);
    legend = createLegend({ unitOfWork, clock: () => NOW });
    journal = createJournal({ unitOfWork });
    officer = await createMember(sql, "officer", "Officier");
    thom = await createMember(sql, "confirmed", "Thom");
    sira = await createMember(sql, "confirmed", "Sira");
    const [thomLeboss, siraVentargent] = await createGuildCharacters(sql, "Thom Leboss", "Sira Ventargent");
    for (const [character, member] of [
      [thomLeboss, thom],
      [siraVentargent, sira],
    ] as const) {
      await characterRepository(sql).link(character.id, member.id);
      await characterRepository(sql).setMain(member.id, character.id);
    }
  });

  afterEach(async () => {
    await database.close();
  });

  /** An officer opens a chapter, and Thom's proposal is published in it. */
  async function published(change: Partial<ExploitProposal> = {}): Promise<{ id: string; chapterId: string }> {
    await legend.createChapter(officer, { title: "Le Cœur du Magma", period: "septembre 2026" }, "Nouvelle phase");
    const [chapter] = await legend.chapters();
    const id = await legend.propose(thom, proposal(change), [capture]);
    await legend.publish(
      officer,
      id,
      { chapterId: chapter?.id ?? "", rarity: "legendary", mvpId: sira.id, mvpWhy: "Résurrection du tank", loot: "" },
      "Premier clear",
    );
    return { id, chapterId: chapter?.id ?? "" };
  }

  it("hangs a member's proposal in a chapter once an officer publishes it, recorded in the journal", async () => {
    const id = await legend.propose(thom, proposal(), [capture]);
    expect((await legend.corridor(sira)).paintings).toBe(0);
    expect((await legend.proposals(officer)).map((view) => [view.exploit.title, view.proposedBy.name])).toEqual([
      ["Ragnaros tombe : premier clear", "Thom Leboss"],
    ]);
    await expect(legend.proposals(thom)).rejects.toBeInstanceOf(ForbiddenError);

    await legend.createChapter(officer, { title: "Le Cœur du Magma", period: "septembre 2026" }, "Nouvelle phase");
    const [chapter] = await legend.chapters();
    await legend.publish(
      officer,
      id,
      { chapterId: chapter?.id ?? "", rarity: "legendary", mvpId: undefined, mvpWhy: "", loot: "" },
      "Premier clear",
    );
    const corridor = await legend.corridor(sira);
    expect(corridor.paintings).toBe(1);
    expect(corridor.chapters.map((entry) => [entry.chapter.title, entry.paintings.length])).toEqual([
      ["Le Cœur du Magma", 1],
    ]);
    expect(corridor.chapters[0]?.paintings[0]?.imageId).toBeDefined();
    expect((await journal.listRecent()).map((entry) => [entry.action, entry.reason])).toEqual([
      ["legend.publish", "Premier clear"],
      ["legend.chapter", "Nouvelle phase"],
    ]);
    await expect(
      legend.publish(
        officer,
        id,
        { chapterId: chapter?.id ?? "", rarity: "rare", mvpId: undefined, mvpWhy: "", loot: "" },
        "Encore",
      ),
    ).rejects.toThrow("Cette proposition n'attend plus d'officier.");
  });

  it("refuses a proposal with the reason its proposer reads", async () => {
    const id = await legend.propose(thom, proposal(), []);
    await expect(legend.refuse(thom, id, "Non")).rejects.toBeInstanceOf(ForbiddenError);
    await legend.refuse(officer, id, "Doublon du tableau de jeudi");
    expect((await legend.myProposals(thom)).map((view) => [view.exploit.status, view.exploit.refusal])).toEqual([
      ["refused", "Doublon du tableau de jeudi"],
    ]);
    expect(await legend.exploit(sira, id)).toBeUndefined();
    expect((await journal.listRecent())[0]).toMatchObject({
      action: "legend.refuse",
      reason: "Doublon du tableau de jeudi",
    });
  });

  it("names who was there: the raid night's players and those who say so, with the MVP and the memories", async () => {
    await createRaidWithLoot(sql);
    const eventId = await createEvent(sql, officer, new Date("2026-09-03T19:00:00Z"), ["onyxia"]);
    const [thomLeboss] = await characterRepository(sql).listByMember(thom.id);
    await recordAttendance(sql, eventId, thomLeboss?.id ?? "");
    const { id } = await published({ eventId });

    await legend.setPresence(sira, id, true);
    await legend.comment(sira, id, "J'ai le clip si quelqu'un doute.");
    const view = await legend.exploit(sira, id);
    expect(view?.people.map((person) => person.name)).toEqual(["Sira Ventargent", "Thom Leboss"]);
    expect(view?.declared).toBe(true);
    expect(view?.mvp?.name).toBe("Sira Ventargent");
    expect(view?.raidNight).toBe("Onyxia");
    expect(view?.comments.map((comment) => [comment.person.name, comment.body])).toEqual([
      ["Sira Ventargent", "J'ai le clip si quelqu'un doute."],
    ]);
    // Both were there: the corridor marks it for each.
    expect((await legend.corridor(thom)).chapters[0]?.paintings[0]?.mine).toBe(true);
    expect((await legend.corridor(sira)).members).toBe(2);
    await legend.setPresence(sira, id, false);
    expect((await legend.exploit(sira, id))?.people.map((person) => person.name)).toEqual(["Thom Leboss"]);
    await expect(legend.comment(sira, id, " ")).rejects.toBeInstanceOf(ValidationError);
  });

  it("shows a capture to whoever may see its painting only", async () => {
    const id = await legend.propose(thom, proposal(), [capture]);
    const [view] = await legend.proposals(officer);
    const imageId = view?.imageIds[0] ?? "";
    expect(await legend.image(sira, imageId)).toBeUndefined();
    expect((await legend.image(thom, imageId))?.contentType).toBe("image/png");
    expect(Array.from((await legend.image(officer, imageId))?.bytes ?? [])).toEqual([137, 80, 78, 71]);
    expect(id).toBeDefined();
  });

  it("refuses a proposal out of its limits", async () => {
    await expect(legend.propose(thom, proposal({ occurredOn: "2026-12-24" }), [])).rejects.toThrow(/date passée/);
    await expect(legend.createChapter(thom, { title: "Chapitre", period: "" }, "Motif")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
