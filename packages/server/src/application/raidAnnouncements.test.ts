import type { PGliteInterface } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventRepository } from "../infrastructure/postgres/events.ts";
import { createUnitOfWork } from "../infrastructure/postgres/unitOfWork.ts";
import type { SqlClient } from "../infrastructure/sql.ts";
import { createEvent, createGuildCharacters, createMember, createRaidWithLoot } from "../test/fixtures.ts";
import { createTestDatabase } from "../testing.ts";
import type { AnnouncedRaid, RaidAnnouncer } from "./ports.ts";
import { createRaidAnnouncements } from "./raidAnnouncements.ts";
import { createSignups } from "./signups.ts";

/** The raid channel, remembering what it shows. */
function createRecordingChannel() {
  const shown = new Map<string, AnnouncedRaid>();
  let available = true;
  const announcer: RaidAnnouncer = {
    async publish(raid) {
      if (!available) {
        throw new Error("Discord is down");
      }
      const messageId = `message-${shown.size + 1}`;
      shown.set(messageId, raid);
      return messageId;
    },
    async update(messageId, raid) {
      if (!shown.has(messageId)) {
        return false;
      }
      shown.set(messageId, raid);
      return true;
    },
  };
  return { announcer, shown, setAvailable: (value: boolean) => (available = value) };
}

describe("raid announcements", () => {
  let database: PGliteInterface;
  let sql: SqlClient;
  let channel: ReturnType<typeof createRecordingChannel>;
  let announcements: ReturnType<typeof createRaidAnnouncements>;
  let eventId: string;

  beforeEach(async () => {
    ({ database, sql } = await createTestDatabase());
    channel = createRecordingChannel();
    announcements = createRaidAnnouncements({ unitOfWork: createUnitOfWork(sql), announcer: channel.announcer });
    const officer = await createMember(sql, "officer", "Officier");
    await createRaidWithLoot(sql);
    eventId = await createEvent(sql, officer, new Date("2026-12-10T20:00:00Z"), ["onyxia"]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await database.close();
  });

  it("publishes the sign-up message once, then updates it with the sign-ups", async () => {
    await announcements.announce(eventId);
    expect((await eventRepository(sql).findById(eventId))?.discordMessageId).toBe("message-1");

    const me = await createMember(sql, "member", "Moi");
    const [deja] = await createGuildCharacters(sql, "Ðéjà Vu");
    await sql.query("update characters set member_id = $1 where id = $2", [me.id, deja.id]);
    const signups = createSignups({ unitOfWork: createUnitOfWork(sql), clock: () => new Date("2026-12-01T12:00:00Z") });
    await signups.signUp(me, eventId, { characterId: deja.id, role: "dps", spec: "Combat", status: "present" });
    await announcements.announce(eventId);

    expect([...channel.shown.keys()]).toEqual(["message-1"]);
    expect(channel.shown.get("message-1")?.signups.map((signup) => signup.characterName)).toEqual(["Ðéjà Vu"]);
  });

  it("publishes again when the message was deleted on Discord", async () => {
    await announcements.announce(eventId);
    channel.shown.clear();
    await announcements.announce(eventId);
    expect([...channel.shown.keys()]).toEqual(["message-1"]);
    expect((await eventRepository(sql).findById(eventId))?.discordMessageId).toBe("message-1");
  });

  it("never fails when Discord is down, and publishes at the next change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    channel.setAvailable(false);
    expect(await announcements.announceQuietly(eventId)).toBe(false);
    channel.setAvailable(true);
    expect(await announcements.announceQuietly(eventId)).toBe(true);
    expect([...channel.shown.keys()]).toEqual(["message-1"]);
  });

  it("ignores an unknown event", async () => {
    await announcements.announce("00000000-0000-0000-0000-000000000000");
    expect(channel.shown.size).toBe(0);
  });
});
