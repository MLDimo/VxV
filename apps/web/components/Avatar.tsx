import { avatarName } from "@vxv/design";
import { classColor } from "./characterClasses";

/** A player's portrait (§8): framed in their class color, the nearest portrait borrowed when theirs is not drawn. */
export function Avatar({
  characterClass,
  race,
  sex,
  size,
}: {
  characterClass: string | undefined;
  race: string | undefined;
  sex: "male" | "female" | undefined;
  size: number;
}) {
  const name = characterClass === undefined ? undefined : avatarName(characterClass, race, sex);
  return (
    <span
      className="inline-block shrink-0 bg-avatar-ground"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 2px ${characterClass === undefined ? "var(--color-line)" : classColor(characterClass)}`,
      }}
    >
      {name !== undefined && (
        // eslint-disable-next-line @next/next/no-img-element -- pixel art at its exact size, no optimisation
        <img src={`/images/avatars/${name}.png`} alt="" width={size} height={size} className="image-pixelated" />
      )}
    </span>
  );
}
