import { canManageRaids, MAX_DUEL_PLACE_LENGTH, type DuelStatus, type DuelView, type Member } from "@vxv/server";
import { formatEventDate } from "@vxv/server/domain/labels";
import Link from "next/link";
import { actOnDuel } from "@/app/actions/duels";
import { Badge } from "@/components/Badge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DuelForm } from "@/components/DuelForm";
import { DuelOfficerForm } from "@/components/DuelOfficerForm";
import { MemberName } from "@/components/MemberName";
import { Panel } from "@/components/Panel";
import { PvpNav } from "@/components/PvpNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireMember } from "@/server/session";

const STATUS_BADGES: Record<Exclude<DuelStatus, "played">, { label: string; tone: "gold" | "gain" | "muted" }> = {
  proposed: { label: "Défi lancé", tone: "gold" },
  scheduled: { label: "Défi relevé", tone: "gain" },
  refused: { label: "Refusé", tone: "muted" },
  cancelled: { label: "Annulé", tone: "muted" },
};

/** A duel: its players, time and place, where it stands, and what the viewer may do with it. */
function DuelItem({ view, member }: { view: DuelView; member: Member }) {
  const { duel, status, challenger, opponent } = view;
  const players = [challenger, opponent];
  const duelist = players.some((player) => player.memberId === member.id);
  const open = status === "proposed" || status === "scheduled";
  const fields = { duelId: duel.id };
  return (
    <li className="panel" aria-label={`Duel : ${challenger.name} contre ${opponent.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-pixel text-lg">
          <MemberName name={challenger.name} characterClass={challenger.characterClass} /> contre{" "}
          <MemberName name={opponent.name} characterClass={opponent.characterClass} />
        </span>
        {status === "played" ? (
          <Badge tone="amethyst">{players.find((player) => player.memberId === duel.winnerId)?.name} gagne</Badge>
        ) : (
          <Badge tone={STATUS_BADGES[status].tone}>{STATUS_BADGES[status].label}</Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {formatEventDate(duel.scheduledAt)} · {duel.place}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {duel.betId !== undefined && (
          <Link href={`/paris/${duel.betId}`} className="button-wood text-gold">
            Voir le pari
          </Link>
        )}
        {status === "proposed" && member.id === duel.opponentId && (
          <>
            <ConfirmButton action={actOnDuel} fields={fields} intent="accept" label="Relever le défi" />
            <ConfirmButton action={actOnDuel} fields={fields} intent="refuse" label="Refuser" />
          </>
        )}
        {status === "scheduled" && duelist && (
          <ConfirmButton action={actOnDuel} fields={fields} intent="concede" label="J'ai perdu" />
        )}
        {open && duelist && (
          <ConfirmButton action={actOnDuel} fields={fields} intent="cancel" label="Annuler le duel" />
        )}
      </div>
      {open && canManageRaids(member.roles) && (
        <div className="panel-officer mt-4">
          <h3 className="font-pixel text-gold">Officiers</h3>
          <DuelOfficerForm duelId={duel.id} players={players} accepted={status === "scheduled"} />
        </div>
      )}
    </li>
  );
}

/** The duels: a challenge to make, those to answer or to play, then the latest ended. */
export default async function DuelsPage() {
  const member = await requireMember();
  const [views, members] = await Promise.all([getApplication().duels.list(), guildMembers()]);
  return (
    <>
      <ScreenHeader kicker="Avis de recherche" kickerClassName="text-loss" title="Duels" />
      <PvpNav current="/pvp/duels" />
      <p className="mt-6 max-w-3xl text-lavender">
        Un contre un, à l&apos;heure et au lieu dits : une fois le défi relevé, la guilde parie sur le vainqueur
        jusqu&apos;à l&apos;heure du duel, sans les deux joueurs. L&apos;addon lit le résultat en jeu ; sinon le perdant
        le reconnaît ici.
      </p>
      <Panel title="Défier un joueur" className="mt-6">
        <DuelForm
          opponents={members.filter((candidate) => candidate.memberId !== member.id)}
          maxPlaceLength={MAX_DUEL_PLACE_LENGTH}
        />
      </Panel>
      {views.length === 0 ? (
        <p className="mt-8 text-muted">Aucun duel pour l&apos;instant.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {views.map((view) => (
            <DuelItem key={view.duel.id} view={view} member={member} />
          ))}
        </ul>
      )}
    </>
  );
}
