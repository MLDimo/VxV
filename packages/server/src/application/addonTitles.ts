import { formatAddonTitles } from "../domain/addonTitles.ts";
import { addonReaders } from "./addonReaders.ts";
import type { Clock, UnitOfWork } from "./ports.ts";
import type { Titles } from "./titles.ts";

/** The titles as the companion hands them to the addon (P13.3): what the game shows of them. */
export function createAddonTitles({
  unitOfWork,
  clock,
  titles,
}: {
  unitOfWork: UnitOfWork;
  clock: Clock;
  titles: Pick<Titles, "weeks">;
}) {
  return {
    /** VXV-TITRES text for the companion of any member: an officer's addon passes it on to the guild. */
    async exportTitles(): Promise<string> {
      const [latest] = await titles.weeks(1);
      return unitOfWork.run(async (repositories) =>
        formatAddonTitles({
          ...(await addonReaders(repositories)),
          holders: latest?.holders ?? [],
          custom: await repositories.customTitles.listHeld(),
          exportedAt: clock(),
        }),
      );
    },
  };
}
