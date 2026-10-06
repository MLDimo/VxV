import { canManageTreasury } from "@vxv/server";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import { DebtBadge } from "@/components/DebtBadge";
import { DiceNav } from "@/components/DiceNav";
import { LedgerTable } from "@/components/LedgerTable";
import { MemberName } from "@/components/MemberName";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** The treasurer's book (P11.6): what is awaited, owed and handed over, and every validation, for all to see. */
export default async function TreasuryPage() {
  const member = await requireMember();
  const { treasury } = getApplication();
  const [book, debt] = await Promise.all([treasury.book(), treasury.debtOf(member)]);
  const treasurer = canManageTreasury(member.roles);
  const amounts = (stakes: typeof book.toPay) => stakes.map((stake) => ({ stake, amount: stake.amount }));
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Le Dé Pipé">
        <DebtBadge debt={debt} />
      </ScreenHeader>
      <DiceNav current="/paris/tresorerie" />
      <p className="mt-6 max-w-3xl text-lavender">
        L&apos;or change de mains en jeu ; le trésorier le note ici, et tout le monde voit les mêmes chiffres. Une mise
        perdue sans avoir été payée devient une dette, qui empêche de parier tant qu&apos;elle n&apos;est pas réglée.
      </p>
      <LedgerTable
        title="Mises à recevoir"
        empty="Aucune mise en attente."
        lines={amounts(book.toPay)}
        intent={treasurer ? "paid" : undefined}
      />
      <LedgerTable
        title="Dettes"
        empty="Aucune dette."
        lines={amounts(book.debts)}
        intent={treasurer ? "paid" : undefined}
      />
      <LedgerTable
        title="Gains et remboursements à verser"
        empty="Rien à verser."
        lines={book.toCollect}
        intent={treasurer ? "collected" : undefined}
      />
      <section className="panel mt-6" aria-label="Historique">
        <h2 className="font-pixel text-xl text-ivory">Historique</h2>
        {book.history.length === 0 ? (
          <p className="mt-3 text-lavender">Aucune validation pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {book.history.map((entry) => (
              <li key={`${entry.kind}-${entry.stake.id}`}>
                {formatDateTime(entry.at)} · {entry.treasurerName} a {entry.kind === "paid" ? "reçu" : "versé"}{" "}
                <span className="font-pixel text-gold">{formatGold(entry.amount)}</span>{" "}
                {entry.kind === "paid" ? "de" : "à"}{" "}
                <MemberName name={entry.stake.memberName} characterClass={entry.stake.memberClass} /> (pari «{" "}
                {entry.stake.betTitle} »)
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
