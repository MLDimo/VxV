import { classColor, classLabel } from "./characterClasses";

/** A character name in its class color, the class shown on hover. */
export function CharacterName({ name, characterClass }: { name: string; characterClass: string }) {
  return (
    <span style={{ color: classColor(characterClass) }} title={classLabel(characterClass)}>
      {name}
    </span>
  );
}
