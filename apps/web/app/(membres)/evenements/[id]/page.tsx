import { fullName, MAX_SPEC_LENGTH } from "@vxv/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventSignups } from "@/components/EventSignups";
import { formatEventDate, raidTitle, softReserveCount } from "@/components/format";
import { SignupForm } from "@/components/SignupForm";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, member] = await Promise.all([params, requireMember()]);
  const { events, signups, characters } = getApplication();
  const event = await events.getEvent(id);
  if (event === undefined) {
    notFound();
  }
  const [eventSignups, mine, ownCharacters] = await Promise.all([
    signups.listForEvent(event.id),
    signups.findMine(member, event.id),
    characters.listMine(member),
  ]);
  const signupCharacters = ownCharacters
    .filter((character) => character.inGuild)
    .map((character) => ({ id: character.id, name: fullName(character), characterClass: character.characterClass }));

  return (
    <>
      <h1 className="text-2xl font-bold">{raidTitle(event.raids.map((raid) => raid.name))}</h1>
      <p className="mt-2 text-zinc-300">{formatEventDate(event.startsAt)}</p>
      <p className="text-zinc-400">{softReserveCount(event.softReservesPerPlayer)} par joueur</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Mon inscription</h2>
        {signupCharacters.length === 0 ? (
          <p className="mt-2 text-zinc-400">
            Pour vous inscrire, liez d&apos;abord un personnage de la guilde dans{" "}
            <Link href="/personnages" className="text-indigo-300 underline">
              Mes personnages
            </Link>
            .
          </p>
        ) : (
          <SignupForm eventId={event.id} characters={signupCharacters} current={mine} maxSpecLength={MAX_SPEC_LENGTH} />
        )}
      </section>

      <EventSignups signups={eventSignups} />
    </>
  );
}
