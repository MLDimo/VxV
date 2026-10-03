import type { Character } from "../domain/characters.ts";
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

/** Each member links their own main and rerolls, among the guild characters nobody has claimed. */
export function createCharacters({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    listMine(member: Member): Promise<Character[]> {
      return unitOfWork.run(({ characters }) => characters.listByMember(member.id));
    },

    listAvailable(): Promise<Character[]> {
      return unitOfWork.run(({ characters }) => characters.listAvailable());
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
  };
}
