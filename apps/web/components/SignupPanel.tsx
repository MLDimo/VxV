import { fullName, MAX_SPEC_LENGTH, type Character, type Signup } from "@vxv/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignupForm } from "./SignupForm";

/** « Mon inscription » for an event: the member's sign-up form, or how to link a guild character first. */
export function SignupPanel({
  eventId,
  characters,
  current,
  note,
}: {
  eventId: string;
  /** The member's characters: those in the guild sign up. */
  characters: readonly Character[];
  current: Signup | undefined;
  /** What the sign-up brings, under the title (a raid night's soft reserves). */
  note?: ReactNode;
}) {
  const signupCharacters = characters
    .filter((character) => character.inGuild)
    .map((character) => ({ id: character.id, name: fullName(character), characterClass: character.characterClass }));
  return (
    <section className="panel">
      <h2 className="font-pixel text-lg text-ivory">Mon inscription</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      {signupCharacters.length === 0 ? (
        <p className="mt-2 text-muted">
          Pour vous inscrire, liez d&apos;abord un personnage de la guilde dans{" "}
          <Link href="/personnages" className="text-amethyst underline">
            Mes personnages
          </Link>
          .
        </p>
      ) : (
        <SignupForm eventId={eventId} characters={signupCharacters} current={current} maxSpecLength={MAX_SPEC_LENGTH} />
      )}
    </section>
  );
}
