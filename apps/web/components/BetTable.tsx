import { ORGANISATION_PERCENT, type BetView, type Member } from "@vxv/server";
import { payout, potentialGain, standing, type Bet, type Stake } from "@vxv/server/domain/bets";
import {
  formatDateTime,
  formatEventDate,
  formatGold,
  formatOdds,
  formatShare,
  STAKE_STANDING_LABELS,
} from "@vxv/server/domain/labels";
import Link from "next/link";
import { StakeForm } from "./StakeForm";

/** What 10 po bring back on each choice, as on the mock-up (§7.2). */
const EXAMPLE_STAKE = 10;

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink/50 px-3 py-2">
      <p className="text-xs font-extrabold text-muted uppercase">{label}</p>
      <p className="font-pixel text-xl text-gold">{value}</p>
    </div>
  );
}

/** When the bet closes, or how it ended. */
function closingText(bet: Bet, open: boolean): string {
  if (open) {
    return `Ferme le ${formatEventDate(bet.closesAt)}`;
  }
  if (bet.endedAt === undefined) {
    return `Fermé depuis le ${formatDateTime(bet.closesAt)} : résultat à venir`;
  }
  const winner = bet.choices.find((choice) => choice.id === bet.winningChoiceId);
  return winner === undefined ? "Pari annulé : mises rendues" : `Résultat : « ${winner.label} »`;
}

/** What the member receives (or owes) for their stake, once the bet ended or while it runs. */
function settlementText(mine: Stake, gain: number): string {
  if (mine.outcome !== undefined && mine.gain !== undefined) {
    const current = standing(mine);
    if (current === "debt") {
      return `Je dois ${formatGold(mine.amount)}`;
    }
    const owed = payout(mine, { outcome: mine.outcome, gain: mine.gain });
    return owed === 0 ? "Rien" : `${formatGold(owed)} (${STAKE_STANDING_LABELS[current].toLowerCase()})`;
  }
  return mine.paidAt === undefined
    ? `${formatGold(gain - mine.amount)} (${formatGold(gain)} − ${formatGold(mine.amount)} non payés)`
    : formatGold(gain);
}

/** A bet on the gaming table (§7.2): when it closes, the pool, each choice's share and odds, and the member's stake. */
export function BetTable({ view, member, linked = false }: { view: BetView; member: Member; linked?: boolean }) {
  const { bet, book, open, stakes } = view;
  const mine = stakes.find((stake) => stake.memberId === member.id);
  const organisation = Math.floor((book.pool * ORGANISATION_PERCENT) / 100);
  const mineLabel = mine && bet.choices.find((choice) => choice.id === mine.choiceId)?.label;
  const gain = mine ? potentialGain(book, mine.choiceId, mine.amount) : 0;
  return (
    <section className="felt" aria-labelledby={`bet-${bet.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`bet-${bet.id}`} className="font-pixel text-2xl text-ivory">
          {linked ? (
            <Link href={`/paris/${bet.id}`} className="hover:text-gold">
              {bet.title}
            </Link>
          ) : (
            bet.title
          )}
        </h2>
        <p
          className={`text-sm ${open ? "text-neon" : bet.endedAt === undefined ? "text-muted" : "font-bold text-gold"}`}
        >
          {closingText(bet, open)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Cagnotte" value={formatGold(book.pool)} />
        <Figure label={`Organisation (${String(ORGANISATION_PERCENT)} %)`} value={formatGold(organisation)} />
        <Figure label="À partager" value={formatGold(book.pool - organisation)} />
        <Figure label="Parieurs" value={String(book.bettors)} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr>
              <th className="py-2 pr-3">Choix</th>
              <th className="py-2 pr-3">Part des mises</th>
              <th className="py-2 pr-3">Mises</th>
              <th className="py-2 pr-3">Parieurs</th>
              <th className="py-2 pr-3">Cote</th>
              <th className="py-2">Gain pour {formatGold(EXAMPLE_STAKE)}</th>
            </tr>
          </thead>
          <tbody>
            {book.choices.map(({ choice, total, bettors, share, odds }) => (
              <tr key={choice.id} className={choice.id === mine?.choiceId ? "bg-gold/10" : undefined}>
                <th scope="row" className="py-2 pr-3 font-bold text-ivory">
                  {choice.label}
                </th>
                <td className="py-2 pr-3">{formatShare(share)}</td>
                <td className="py-2 pr-3">{formatGold(total)}</td>
                <td className="py-2 pr-3">{bettors}</td>
                <td className="py-2 pr-3 font-pixel text-gold">{formatOdds(odds)}</td>
                <td className="py-2">
                  {odds === undefined ? "—" : formatGold(potentialGain(book, choice.id, EXAMPLE_STAKE))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mine && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Figure label="Ma mise" value={`${formatGold(mine.amount)} sur « ${mineLabel ?? ""} »`} />
          <Figure label="Statut" value={mine.paidAt === undefined ? "Déposée · à payer" : "Payée"} />
          <Figure
            label={mine.outcome === undefined ? "Si je gagne, je reçois" : "Je reçois"}
            value={settlementText(mine, gain)}
          />
        </div>
      )}
      {open && <StakeForm bet={bet} current={mine} />}
      <p className="mt-3 text-xs text-muted">
        {open
          ? "Cotes recalculées à chaque mise, définitives à la fermeture. Mise en po, 1 po au moins, à payer au trésorier ; modifiable tant qu'elle n'est pas payée."
          : bet.endedAt === undefined
            ? "Les cotes sont définitives : le résultat sera déclaré par un officier."
            : "Les gains se récupèrent auprès du trésorier ; une mise perdue non payée devient une dette."}
      </p>
    </section>
  );
}
