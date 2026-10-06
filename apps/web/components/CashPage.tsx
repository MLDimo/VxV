import { CASH_KIND_LABELS, type CashOverview } from "@vxv/server";
import { formatDateTime, formatGold, formatSignedGold } from "@vxv/server/domain/labels";
import { CashMovementForm, type Giver } from "./CashMovementForm";

/** The accounts book's left page (§7.7): the guild's cash, its balance and every movement with its reason. */
export function CashPage({
  overview,
  treasurer,
  givers,
}: {
  overview: CashOverview;
  treasurer: boolean;
  givers: Giver[];
}) {
  return (
    <section className="ruled-page p-6 shadow-[inset_-24px_0_30px_-18px_rgba(70,40,10,0.55)]">
      <h2 className="font-pixel text-xl">La caisse</h2>
      <p className="mt-4 text-xs font-extrabold uppercase">Solde</p>
      <p className="font-pixel text-[40px] leading-none text-stamp-cash">{formatGold(overview.balance)}</p>
      <div className="mt-3 flex flex-wrap gap-6 text-sm">
        <p>
          Entrées du mois <span className="font-bold text-ink-gain">{formatSignedGold(overview.entries)}</span>
        </p>
        <p>
          Sorties du mois <span className="font-bold text-ink-loss">{formatSignedGold(overview.exits)}</span>
        </p>
      </div>
      {overview.movements.length === 0 ? (
        <p className="mt-6">Aucun mouvement : la part des paris, les dons et les dépenses s&apos;inscrivent ici.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {overview.movements.map((movement) => (
            <li key={movement.id}>
              <p className="flex justify-between gap-3">
                <span>
                  <span className="text-sm">{formatDateTime(movement.occurredAt)}</span> · {movement.label}
                </span>
                <span className={`font-bold ${movement.amount > 0 ? "text-ink-gain" : "text-ink-loss"}`}>
                  {formatSignedGold(movement.amount)}
                </span>
              </p>
              <p className="text-sm italic">
                {CASH_KIND_LABELS[movement.kind]}
                {movement.memberName === undefined ? "" : ` de ${movement.memberName}`} · {movement.recordedByName} ·
                Motif : {movement.reason}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm">Pour un don, donne l&apos;or au trésorier en jeu : il l&apos;inscrit ici.</p>
      {treasurer && (
        <div className="mt-4">
          <h3 className="font-pixel text-lg">Trésorier · inscrire un mouvement</h3>
          <CashMovementForm givers={givers} />
        </div>
      )}
    </section>
  );
}
