import { renderInbox } from "../domain/inbox.ts";
import type { GameFiles, SitePort } from "./ports.ts";

/** What a synchronisation did, shown in the window. */
export interface SyncReport {
  at: Date;
  /** The next event brought to the game, if any. */
  raid: { title: string; startsAt: string } | undefined;
  /** Versions of the game whose addon has no VXV_Sync yet: the addon must be updated there. */
  outdated: string[];
}

export interface SyncDependencies {
  site: Pick<SitePort, "download">;
  gameFiles: GameFiles;
}

/**
 * Brings the website's data to every version of the game where VXV is installed (P7.3): the addon reads them at
 * the next /reload or launch.
 */
export async function synchronize(
  { site, gameFiles }: SyncDependencies,
  token: string,
  installations: readonly string[],
  now: Date,
): Promise<SyncReport> {
  const { raid } = await site.download(token);
  const inbox = renderInbox({ raid: raid?.text, writtenAt: now });
  const outdated: string[] = [];
  for (const installation of installations) {
    if (!(await gameFiles.writeInbox(installation, inbox))) {
      outdated.push(installation);
    }
  }
  return { at: now, raid: raid === null ? undefined : { title: raid.title, startsAt: raid.startsAt }, outdated };
}
