import { canManageRaids, ORGANISATION_PERCENT } from "@vxv/server";
import { count, formatGold } from "@vxv/server/domain/labels";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { BetTable } from "@/components/BetTable";
import { DebtBadge } from "@/components/DebtBadge";
import { DiceNav } from "@/components/DiceNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** Le Dé Pipé (§7.2): the open bets on the gaming table, then the closed ones. */
export default async function BetsPage() {
  const member = await requireMember();
  const { bets: allBets, treasury } = getApplication();
  const [bets, debt] = await Promise.all([allBets.list(), treasury.debtOf(member)]);
  const open = bets.filter((view) => view.open);
  const closed = bets.filter((view) => !view.open);
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Le Dé Pipé">
        <DebtBadge debt={debt} />
        <Badge tone="gold">{ORGANISATION_PERCENT} % pour la caisse</Badge>
        {canManageRaids(member.roles) && (
          <Link href="/paris/nouveau" className="button-wood text-gold">
            Ouvrir un pari
          </Link>
        )}
      </ScreenHeader>
      <DiceNav current="/paris" />
      <div className="mt-8 space-y-8">
        {open.length === 0 && (
          <p className="text-lavender">Aucun pari ouvert : les officiers les lancent ici et sur Discord.</p>
        )}
        {open.map((view) => (
          <BetTable key={view.bet.id} view={view} member={member} linked />
        ))}
      </div>
      {closed.length > 0 && (
        <section className="mt-10">
          <h2 className="font-pixel text-xl text-ivory">Paris fermés</h2>
          <ul className="mt-4 space-y-2">
            {closed.map(({ bet, book }) => (
              <li key={bet.id} className="panel flex flex-wrap justify-between gap-2">
                <Link href={`/paris/${bet.id}`} className="font-bold text-ivory hover:text-gold">
                  {bet.title}
                </Link>
                <span className="text-sm text-muted">
                  Cagnotte {formatGold(book.pool)} · {count(book.bettors, "parieur")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
