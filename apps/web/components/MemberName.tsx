import { CharacterName } from "./CharacterName";

/** A member by their main character, in its class color; by their Discord name, in plain text, without one. */
export function MemberName({ name, characterClass }: { name: string; characterClass: string | undefined }) {
  return characterClass === undefined ? (
    <span className="text-muted">{name}</span>
  ) : (
    <CharacterName name={name} characterClass={characterClass} />
  );
}
