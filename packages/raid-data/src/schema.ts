import { z } from "zod";

const positiveId = z.number().int().positive();
const label = z.string().trim().min(1);

const itemSchema = z.strictObject({
  itemId: positiveId,
  name: label,
});

const bossSchema = z.strictObject({
  encounterId: positiveId,
  name: label,
  loot: z.array(itemSchema).min(1),
});

/** Content of one data/raids/<id>.json file. Bosses are listed in their usual kill order. */
export const raidFileSchema = z.strictObject({
  name: label,
  instanceId: positiveId,
  bosses: z.array(bossSchema).min(1),
});

export type Item = z.infer<typeof itemSchema>;
export type Boss = z.infer<typeof bossSchema>;
export type RaidFile = z.infer<typeof raidFileSchema>;

/** A validated raid. Its id is the file name without extension (single source of truth). */
export interface Raid extends RaidFile {
  id: string;
}
