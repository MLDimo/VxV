import { fullName } from "../domain/characters.ts";
import { LOOT_METHODS, SOFT_RESERVE_METHODS, type LootMethod, type LootRecord } from "../domain/history.ts";
import type { LootCorrectionRecord } from "../domain/journal.ts";
import type { Member } from "../domain/members.ts";
import { ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { UnitOfWork } from "./ports.ts";

const HISTORY_SIZE = 200;

function isLootMethod(value: string): value is LootMethod {
  return (LOOT_METHODS as readonly string[]).includes(value);
}

export function createHistory({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** Loots of previous raids, readable by every member: all of them, or only those given by soft reserve. */
    listLoots({ softReserveOnly }: { softReserveOnly: boolean }): Promise<LootRecord[]> {
      const methods = softReserveOnly ? SOFT_RESERVE_METHODS : LOOT_METHODS;
      return unitOfWork.run(({ lootHistory }) => lootHistory.list(HISTORY_SIZE, methods));
    },

    /** An officer corrects who received a loot and how it was given, with a reason kept in the journal. */
    async correctLoot(
      officer: Member,
      lootId: string,
      correction: { characterId: string; method: string },
      reason: string,
    ): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      const { method } = correction;
      if (!isLootMethod(method)) {
        throw new ValidationError("Choisissez comment l'objet a été attribué.");
      }
      await unitOfWork.run(async ({ lootHistory, characters, journal }) => {
        const loot = await lootHistory.findById(lootId);
        const character = await characters.findById(correction.characterId);
        if (loot === undefined) {
          throw new ValidationError("Ce loot n'existe pas.");
        }
        if (character === undefined) {
          throw new ValidationError("Choisissez un personnage de la guilde.");
        }
        const winnerName = fullName(character);
        if (winnerName === loot.winnerName && method === loot.method) {
          throw new ValidationError("Rien à corriger : même personnage et même mode d'attribution.");
        }
        await lootHistory.correct(loot.id, character.id, method);
        const record: LootCorrectionRecord = {
          itemName: loot.itemName,
          raids: loot.raids,
          eventStartsAt: loot.eventStartsAt.toISOString(),
          before: { winnerName: loot.winnerName, method: loot.method },
          after: { winnerName, method },
        };
        await journal.record({
          actorId: officer.id,
          action: "loot.correct",
          entity: "loot",
          entityId: `${loot.eventId}/${loot.id}`,
          before: null,
          after: record,
          reason: motive,
        });
      });
    },
  };
}
