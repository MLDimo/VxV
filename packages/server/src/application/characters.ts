import { appearanceFromGame, fullName, type Character } from "../domain/characters.ts";
import { linkRefusal, ownershipRefusal } from "../domain/characterLinks.ts";
import type { Member } from "../domain/members.ts";
import { ValidationError } from "./errors.ts";
import type { CharacterRepository, UnitOfWork } from "./ports.ts";

function refuseIf(refusal: string | undefined): void {
  if (refusal !== undefined) {
    throw new ValidationError(refusal);
  }
}

async function ownedCharacter(characters: CharacterRepository, member: Member, characterId: string): Promise<void> {
  refuseIf(ownershipRefusal(await characters.findById(characterId), member.id));
}

/** A character as the addon of its player saw it in game: UnitRace's token and UnitSex. */
export interface GameCharacter {
  name: string;
  race: string;
  sex: number;
}

/** Each member links their own main and rerolls, among the guild characters nobody has claimed. */
export function createCharacters({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    listMine(member: Member): Promise<Character[]> {
      return unitOfWork.run(({ characters }) => characters.listByMember(member.id));
    },

    listAvailable(): Promise<Character[]> {
      return unitOfWork.run(({ characters }) => characters.listAvailable());
    },

    /** The guild's characters, by name: whom an officer may name as a loot's winner. */
    async listInGuild(): Promise<Character[]> {
      const all = await unitOfWork.run(({ characters }) => characters.listAll());
      return all
        .filter((character) => character.inGuild)
        .sort((left, right) => fullName(left).localeCompare(fullName(right)));
    },

    link(member: Member, characterId: string, asMain: boolean): Promise<void> {
      return unitOfWork.run(async ({ characters }) => {
        refuseIf(linkRefusal(await characters.findById(characterId), member.id));
        await characters.link(characterId, member.id);
        if (asMain) {
          await characters.setMain(member.id, characterId);
        }
      });
    },

    setMain(member: Member, characterId: string): Promise<void> {
      return unitOfWork.run(async ({ characters }) => {
        await ownedCharacter(characters, member, characterId);
        await characters.setMain(member.id, characterId);
      });
    },

    unlink(member: Member, characterId: string): Promise<void> {
      return unitOfWork.run(async ({ characters }) => {
        await ownedCharacter(characters, member, characterId);
        await characters.unlink(characterId);
      });
    },

    /**
     * How the member's own characters look in game, sent by their companion (P7.4): kept for the avatars. Another
     * member's character, or a value the game does not give, is left aside. Returns how many were kept.
     */
    recordAppearances(member: Member, seen: readonly GameCharacter[]): Promise<number> {
      return unitOfWork.run(async ({ characters }) => {
        const mine = new Map(
          (await characters.listByMember(member.id)).map((character) => [fullName(character), character]),
        );
        let kept = 0;
        for (const { name, race, sex } of seen) {
          const character = mine.get(name);
          const appearance = appearanceFromGame(race, sex);
          if (character !== undefined && appearance !== undefined) {
            await characters.setAppearance(character.id, appearance);
            kept += 1;
          }
        }
        return kept;
      });
    },
  };
}
