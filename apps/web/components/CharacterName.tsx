import { classLabel } from "@vxv/server/domain/characterClasses";
import { classColor } from "./characterClasses";

/** A character name in its class color (darkened on parchment), the class shown on hover. */
export function CharacterName({
  name,
  characterClass,
  onParchment = false,
}: {
  name: string;
  characterClass: string;
  onParchment?: boolean;
}) {
  return (
    <span style={{ color: classColor(characterClass, onParchment) }} title={classLabel(characterClass)}>
      {name}
    </span>
  );
}
