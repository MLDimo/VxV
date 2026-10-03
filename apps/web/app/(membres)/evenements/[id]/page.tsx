import { canManageRaids, fullName, MAX_SPEC_LENGTH } from "@vxv/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventSignups } from "@/components/EventSignups";
import { ExclusionForm } from "@/components/ExclusionForm";
import { formatEventDate, raidTitle, softReserveCount } from "@/components/format";
import { SignupForm } from "@/components/SignupForm";
import { SoftReserveBoardForm } from "@/components/SoftReserveBoardForm";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, member] = await Promise.all([params, requireMember()]);
  const { events, signups, characters, softReserves } = getApplication();
  const event = await events.getEvent(id);
  if (event === undefined) {
    notFound();
  }
  const [eventSignups, board, ownCharacters] = await Promise.all([
    signups.listForEvent(event.id),
    softReserves.getBoard(member, event.id),
    characters.listMine(member),
  ]);
  if (board === undefined) {
    notFound();
  }
  const mine = board.mySignup;
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Soft reserves</h2>
        <SoftReserveBoardForm
          key={mine?.characterId ?? "none"}
          eventId={event.id}
          items={board.items}
          allowance={board.allowance}
          canReserve={mine !== undefined}
        />
      </section>

      {canManageRaids(member.role) && (
        <section className="mt-8 rounded border border-amber-900/60 p-4">
          <h2 className="text-lg font-semibold">Officiers · exclusions</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Exclure un objet retire les SR déjà posées dessus. Chaque changement est inscrit au journal.
          </p>
          <ExclusionForm eventId={event.id} items={board.items} />
        </section>
      )}

      <EventSignups signups={eventSignups} />
    </>
  );
}
