import { canManageTreasury } from "@vxv/server";
import { formatDateTime, formatGold, formatPlace } from "@vxv/server/domain/labels";
import Link from "next/link";
import { DebtBadge } from "@/components/DebtBadge";
import { DiceNav } from "@/components/DiceNav";
import { LedgerTable } from "@/components/LedgerTable";
import { MemberName } from "@/components/MemberName";
import { RewardPayment } from "@/components/RewardPayment";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** The treasurer's book (P11.6): what is awaited, owed and handed over, and every validation, for all to see. */
export default async function TreasuryPage() {
  const member = await requireMember();
  const { treasury, missions } = getApplication();
  const [book, debt, quests] = await Promise.all([treasury.book(), treasury.debtOf(member), missions.list()]);
  const unpaidRewards = quests.flatMap((view) =>
    view.rewards.filter((reward) => reward.paidAt === undefined).map((reward) => ({ mission: view.mission, reward })),
  );
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
      <section className="panel mt-6" aria-label="Récompenses de quêtes à verser">
        <h2 className="font-pixel text-xl text-ivory">Récompenses de quêtes à verser</h2>
        {unpaidRewards.length === 0 ? (
          <p className="mt-3 text-lavender">Aucune récompense en attente.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {unpaidRewards.map(({ mission, reward }) => (
              <li key={`${mission.id}-${String(reward.rank)}`} className="flex flex-wrap items-center gap-3">
                <span>
                  <Link href={`/quetes/${mission.id}`} className="hover:text-gold">
                    {mission.title}
                  </Link>{" "}
                  · {formatPlace(reward.rank)} ·{" "}
                  <MemberName name={reward.memberName} characterClass={reward.memberClass} /> ·{" "}
                  <span className="font-pixel text-gold">{formatGold(reward.amount)}</span>
                </span>
                {treasurer && <RewardPayment missionId={mission.id} rank={reward.rank} />}
              </li>
            ))}
          </ul>
        )}
      </section>
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
