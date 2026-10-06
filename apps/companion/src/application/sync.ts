import { readLuaData, LuaDataError } from "@vxv/lua";
import { renderInbox } from "../domain/inbox.ts";
import { mergeOutboxes, readOutbox, type Outbox } from "../domain/outbox.ts";
import { SiteError } from "./errors.ts";
import type { GameFiles, SitePort, Upload } from "./ports.ts";

/** What a synchronisation did, shown in the window. */
export interface SyncReport {
  at: Date;
  /** The next event brought to the game, if any. */
  raid: { title: string; startsAt: string } | undefined;
  /** Versions of the game whose addon has no VXV_Sync yet: the addon must be updated there. */
  outdated: string[];
  /** What the website made of the data sent, in French; empty when nothing new was sent. */
  sent: string[];
}

export interface SyncDependencies {
  site: Pick<SitePort, "download" | "upload">;
  gameFiles: GameFiles;
}

export interface SyncContext {
  token: string;
  installations: readonly string[];
  /** The roster and the raids' records go to the website from an officer only. */
  officer: boolean;
  now: Date;
  /** What the website already received, kept between synchronisations: each item is sent once. */
  sent: Set<string>;
}

const NEWER_ADDON = "L'addon VXV est plus récent que le compagnon : mets le compagnon à jour.";

/** What the addon saved for the website in every account of these versions of the game. */
async function collect(gameFiles: GameFiles, installations: readonly string[]): Promise<Outbox> {
  const outboxes: Outbox[] = [];
  for (const installation of installations) {
    for (const file of await gameFiles.savedFiles(installation)) {
      let reading;
      try {
        reading = readOutbox(readLuaData(await gameFiles.read(file.path)));
      } catch (error) {
        // A file the game is writing, or damaged: the next synchronisation reads it again.
        if (error instanceof LuaDataError) {
          continue;
        }
        throw error;
      }
      if (reading.kind === "newer") {
        throw new SiteError(NEWER_ADDON);
      }
      if (reading.kind === "read") {
        outboxes.push(reading.outbox);
      }
    }
  }
  return mergeOutboxes(outboxes);
}

/** What the website has not received yet, and the keys that remember it once sent. */
function unsent(outbox: Outbox, officer: boolean, sent: ReadonlySet<string>): { upload: Upload; keys: string[] } {
  const keys: string[] = [];
  const isNew = (key: string) => {
    if (sent.has(key)) {
      return false;
    }
    keys.push(key);
    return true;
  };
  const roster = officer && outbox.roster !== undefined && isNew(`roster:${String(outbox.roster.capturedAt)}`);
  return {
    upload: {
      ...(roster && outbox.roster !== undefined ? { roster: outbox.roster } : {}),
      raidLogs: officer ? outbox.raidLogs.filter((log) => isNew(`log:${log}`)) : [],
      characters: outbox.characters.filter((look) => isNew(`look:${look.name}:${look.race}:${String(look.sex)}`)),
      changes: outbox.changes.filter((change) => isNew(`change:${change.id}`)),
      counters: outbox.counters.filter((reading) =>
        isNew(`counter:${reading.name}:${reading.type}:${String(reading.at)}`),
      ),
    },
    keys,
  };
}

/**
 * Takes to the website what the addon saved since the last time (P7.4), then brings the website's data to every
 * version of the game where VXV is installed (P7.3): the addon reads them at the next /reload or launch.
 */
export async function synchronize(
  { site, gameFiles }: SyncDependencies,
  { token, installations, officer, now, sent }: SyncContext,
): Promise<SyncReport> {
  const { upload, keys } = unsent(await collect(gameFiles, installations), officer, sent);
  const messages: string[] = [];
  if (keys.length > 0) {
    const report = await site.upload(token, upload);
    for (const key of keys) {
      sent.add(key);
    }
    messages.push(
      ...(report.roster === undefined ? [] : [report.roster]),
      ...report.raidLogs,
      ...(report.changes === undefined ? [] : [report.changes]),
      ...(report.counters === undefined ? [] : [report.counters]),
    );
  }
  const { raid, paris, quetes } = await site.download(token);
  const inbox = renderInbox({ raid: raid?.text, paris: paris?.text, quetes: quetes?.text, writtenAt: now });
  const outdated: string[] = [];
  for (const installation of installations) {
    if (!(await gameFiles.writeInbox(installation, inbox))) {
      outdated.push(installation);
    }
  }
  return {
    at: now,
    raid: raid === null ? undefined : { title: raid.title, startsAt: raid.startsAt },
    outdated,
    sent: messages,
  };
}
