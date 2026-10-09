import { CharacterName } from "./CharacterName";

/** A member by their main character, in its class color; by their Discord name, in plain text, without one. */
export function MemberName({
  name,
  characterClass,
  onParchment = false,
}: {
  name: string;
  characterClass: string | undefined;
  onParchment?: boolean;
}) {
  return characterClass === undefined ? (
    <span className={onParchment ? "text-parchment-muted" : "text-muted"}>{name}</span>
  ) : (
    <CharacterName name={name} characterClass={characterClass} onParchment={onParchment} />
  );
}
