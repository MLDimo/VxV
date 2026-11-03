import type { z } from "zod";
import { raidFileSchema, type Raid } from "./schema.ts";

export interface RaidSource {
  fileName: string;
  content: string;
}

/** Thrown with every problem found, so that a maintainer can fix a data file in one pass. */
export class RaidDataError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid instance data:\n- ${issues.join("\n- ")}`);
    this.name = "RaidDataError";
  }
}

const FILE_NAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

/** A data file (a raid, a dungeon) checked against its schema, its id taken from its name; its problems in issues. */
export function parseDataFile<Schema extends z.ZodType<object>>(
  source: RaidSource,
  schema: Schema,
  issues: string[],
): (z.infer<Schema> & { id: string }) | undefined {
  const id = FILE_NAME.exec(source.fileName)?.[1];
  if (id === undefined) {
    issues.push(`${source.fileName}: file name must be lowercase words joined by dashes, e.g. mont-hyjal.json`);
    return undefined;
  }
  let json: unknown;
  try {
    json = JSON.parse(source.content);
  } catch (error) {
    issues.push(`${source.fileName}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return undefined;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push(`${source.fileName}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return undefined;
  }
  return { id, ...result.data };
}

export function duplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}

/** Rules spanning several bosses or raids, which the per-file schema cannot express. */
function crossRaidIssues(raids: readonly Raid[]): string[] {
  const bosses = raids.flatMap((raid) => raid.bosses.map((boss) => ({ raid, boss })));
  const issues = [
    ...duplicates(raids.map((raid) => raid.instanceId)).map((id) => `instanceId ${id} is used by several raids`),
    ...duplicates(bosses.map(({ boss }) => boss.encounterId)).map(
      (id) => `encounterId ${id} is used by several bosses`,
    ),
    ...bosses.flatMap(({ raid, boss }) =>
      duplicates(boss.loot.map((item) => item.itemId)).map(
        (id) => `${raid.id}.json: item ${id} is listed twice for ${boss.name}`,
      ),
    ),
  ];
  const nameByItem = new Map<number, string>();
  for (const item of bosses.flatMap(({ boss }) => boss.loot)) {
    const knownName = nameByItem.get(item.itemId);
    if (knownName !== undefined && knownName !== item.name) {
      issues.push(`item ${item.itemId} has two names: "${knownName}" and "${item.name}"`);
    }
    nameByItem.set(item.itemId, item.name);
  }
  return issues;
}

/** Validates every raid source and returns the raids sorted by id, or throws a RaidDataError. */
export function parseRaids(sources: readonly RaidSource[]): Raid[] {
  const issues: string[] = [];
  const raids: Raid[] = sources.flatMap((source) => parseDataFile(source, raidFileSchema, issues) ?? []);
  issues.push(...crossRaidIssues(raids));
  if (issues.length > 0) {
    throw new RaidDataError(issues);
  }
  return raids.sort((left, right) => left.id.localeCompare(right.id));
}
