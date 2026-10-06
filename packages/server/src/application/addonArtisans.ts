import { formatAddonArtisans } from "../domain/addonArtisans.ts";
import { addonReaders } from "./addonReaders.ts";
import type { Clock, UnitOfWork } from "./ports.ts";

/** The artisans directory as the companion hands it to the addon (P14.2): what the Artisans place shows in game. */
export function createAddonArtisans({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  return {
    /** VXV-ARTISANS text for the companion of any member. */
    exportArtisans(): Promise<string> {
      return unitOfWork.run(async (repositories) =>
        formatAddonArtisans({
          ...(await addonReaders(repositories)),
          professions: await repositories.professions.listAll(),
          recipes: await repositories.professions.listRecipes(),
          known: await repositories.professions.listKnown(),
          exportedAt: clock(),
        }),
      );
    },
  };
}
