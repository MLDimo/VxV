import { eventAudience } from "@vxv/server/domain/eventRoles";
import { formatDateTime, formatEventDate, raidTitle, softReserveCount } from "@vxv/server/domain/labels";
import { canManageRaids, fullName, MAX_SPEC_LENGTH } from "@vxv/server";
import { isComing } from "@vxv/server/domain/signups";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddonExport } from "@/components/AddonExport";
import { Badge } from "@/components/Badge";
import { EventSignups } from "@/components/EventSignups";
import { ExclusionForm } from "@/components/ExclusionForm";
import { RaidLogImportForm } from "@/components/RaidLogImportForm";
import { RaidNav } from "@/components/RaidNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SignupForm } from "@/components/SignupForm";
import { SoftReserveBoardForm } from "@/components/SoftReserveBoardForm";
import { SoftReserveOverrideForm } from "@/components/SoftReserveOverrideForm";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, member] = await Promise.all([params, requireMember()]);
  const { events, signups, characters, softReserves, addonExport } = getApplication();
  const event = await events.getEvent(id);
  if (event === undefined) {
    notFound();
  }
  const isOfficer = canManageRaids(member.roles);
  const [eventSignups, board, ownCharacters, addonText] = await Promise.all([
    signups.listForEvent(event.id),
    softReserves.getBoard(member, event.id),
    characters.listMine(member),
    isOfficer ? addonExport.exportEvent(member, event.id) : undefined,
  ]);
  if (board === undefined) {
    notFound();
  }
  const mine = board.mySignup;
  const signupCharacters = ownCharacters
    .filter((character) => character.inGuild)
    .map((character) => ({ id: character.id, name: fullName(character), characterClass: character.characterClass }));

  const expected = eventSignups.filter((signup) => isComing(signup.status)).length;

  return (
    <>
      <ScreenHeader kicker="Conseil de guerre" title={raidTitle(event.raids.map((raid) => raid.name))}>
        <span className="text-lavender">{formatEventDate(event.startsAt)}</span>
        <Badge tone="amethyst">{eventAudience(event.role)}</Badge>
        <Badge tone="gain">{expected} attendus</Badge>
        <Badge tone="gold">{board.locked ? "SR verrouillées" : `SR jusqu'au ${formatDateTime(board.lockAt)}`}</Badge>
      </ScreenHeader>
      <RaidNav />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="panel">
          <h2 className="font-pixel text-lg text-ivory">Mon inscription</h2>
          <p className="mt-1 text-sm text-muted">{softReserveCount(event.softReservesPerPlayer)} par joueur</p>
          {signupCharacters.length === 0 ? (
            <p className="mt-2 text-muted">
              Pour vous inscrire, liez d&apos;abord un personnage de la guilde dans{" "}
              <Link href="/personnages" className="text-amethyst underline">
                Mes personnages
              </Link>
              .
            </p>
          ) : (
            <SignupForm
              eventId={event.id}
              characters={signupCharacters}
              current={mine}
              maxSpecLength={MAX_SPEC_LENGTH}
            />
          )}
        </section>
        <EventSignups signups={eventSignups} />
      </div>

      <section className="panel mt-8">
        <h2 className="font-pixel text-lg text-ivory">Soft reserves</h2>
        <SoftReserveBoardForm
          key={mine?.characterId ?? "none"}
          eventId={event.id}
          items={board.items}
          allowance={board.allowance}
          signedUp={mine !== undefined}
          locked={board.locked}
          lockLabel={formatDateTime(board.lockAt)}
        />
      </section>

      {addonText !== undefined && (
        <section className="panel-officer mt-10">
          <h2 className="font-pixel text-lg text-ivory">Officiers · addon</h2>
          <p className="mt-1 text-sm text-muted">
            Collez ces données dans l&apos;addon : il les transmet à toute la guilde connectée. Recopiez-les après
            chaque changement, au plus tard une fois les SR verrouillées.
          </p>
          <AddonExport text={addonText} />
          <h3 className="mt-8 font-pixel text-ivory">Après le raid</h3>
          <p className="mt-1 text-sm text-muted">
            Collez le journal exporté par l&apos;addon (onglet Butin) : présents et objets donnés sont enregistrés, et
            le récap part sur Discord. Un nouvel import n&apos;ajoute que ce qui manque.
          </p>
          <RaidLogImportForm eventId={event.id} />
        </section>
      )}

      {isOfficer && (
        <section className="panel-officer mt-10">
          <h2 className="font-pixel text-lg text-ivory">Officiers · exclusions et corrections</h2>
          <p className="mt-1 text-sm text-muted">
            Exclure un objet retire les SR déjà posées dessus. Chaque changement est inscrit au journal.
          </p>
          <ExclusionForm eventId={event.id} items={board.items} />
          <h3 className="mt-8 font-pixel text-ivory">Corriger les SR d&apos;un joueur</h3>
          <SoftReserveOverrideForm
            eventId={event.id}
            items={board.items}
            players={eventSignups.map(({ characterId, characterName }) => ({ characterId, characterName }))}
          />
        </section>
      )}
    </>
  );
}
