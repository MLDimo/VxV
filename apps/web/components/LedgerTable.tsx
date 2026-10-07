import type { LedgerStake } from "@vxv/server";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import Link from "next/link";
import { MemberName } from "./MemberName";
import { validateStake } from "@/app/actions/treasury";
import { ConfirmButton } from "./ConfirmButton";
import { Panel } from "./Panel";

interface LedgerLine {
  stake: LedgerStake;
  amount: number;
}

/** A list of the treasurer's book: who, which bet and choice, how much; the treasurer's button on each line. */
export function LedgerTable({
  title,
  empty,
  lines,
  intent,
}: {
  title: string;
  empty: string;
  lines: LedgerLine[];
  /** The treasurer's validation on each line; none for the other members. */
  intent: "paid" | "collected" | undefined;
}) {
  return (
    <Panel title={title} className="mt-6">
      {lines.length === 0 ? (
        <p className="mt-3 text-lavender">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr>
              <th className="py-2 pr-3">Joueur</th>
              <th className="py-2 pr-3">Pari</th>
              <th className="py-2 pr-3">Choix</th>
              <th className="py-2 pr-3">Montant</th>
              <th className="py-2 pr-3">Mise le</th>
              {intent !== undefined && <th className="py-2">Trésorier</th>}
            </tr>
          </thead>
          <tbody>
            {lines.map(({ stake, amount }) => (
              <tr key={stake.id}>
                <td className="py-1 pr-3">
                  <MemberName name={stake.memberName} characterClass={stake.memberClass} />
                </td>
                <td className="py-1 pr-3">
                  <Link href={`/paris/${stake.betId}`} className="hover:text-gold">
                    {stake.betTitle}
                  </Link>
                </td>
                <td className="py-1 pr-3">{stake.choiceLabel}</td>
                <td className="py-1 pr-3 font-pixel text-gold">{formatGold(amount)}</td>
                <td className="py-1 pr-3">{formatDateTime(stake.placedAt)}</td>
                {intent !== undefined && (
                  <td className="py-1">
                    <ConfirmButton
                      action={validateStake}
                      fields={{ stakeId: stake.id }}
                      intent={intent}
                      label={intent === "paid" ? "Reçue" : "Versé"}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
