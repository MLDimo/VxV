import type { DeathrollView } from "@vxv/server";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import { CharacterName } from "@/components/CharacterName";
import { confirmDeathrollPayment } from "@/app/actions/deathrolls";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DiceNav } from "@/components/DiceNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";
import { Panel } from "@/components/Panel";

/** « Thom Leboss bat Vorn Cendrelune · 500 po ». */
function Duel({ view }: { view: DeathrollView }) {
  return (
    <>
      <CharacterName name={view.winner.name} characterClass={view.winner.characterClass} /> bat{" "}
      <CharacterName name={view.loser.name} characterClass={view.loser.characterClass} /> ·{" "}
      <span className="font-pixel text-gold">{formatGold(view.game.stake)}</span>
    </>
  );
}

/** Le Dé Pipé · Deathroll (P15): the member's unpaid games, then the latest games with their rolls. */
export default async function DeathrollPage() {
  const member = await requireMember();
  const { deathrolls } = getApplication();
  const { owed, toConfirm } = await deathrolls.debtsOf(member);
  const games = await deathrolls.list();
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Deathroll" />
      <DiceNav current="/paris/deathroll" />
      <p className="mt-6 max-w-3xl text-lavender">
        Un contre un, depuis l&apos;addon : le défié roll le premier, chacun ensuite de 1 au résultat précédent ; qui
        fait 1 perd la mise, due au gagnant jusqu&apos;à ce qu&apos;il confirme le paiement. Une dette bloque les paris
        et les deathrolls.
      </p>
      {(owed.length > 0 || toConfirm.length > 0) && (
        <Panel title="Mes dettes" label="Mes dettes de deathroll" className="mt-6">
          <ul className="mt-3 space-y-2">
            {owed.map((view) => (
              <li key={view.game.id} className="text-loss">
                Tu dois {formatGold(view.game.stake)} à{" "}
                <CharacterName name={view.winner.name} characterClass={view.winner.characterClass} />.
              </li>
            ))}
            {toConfirm.map((view) => (
              <li key={view.game.id} className="flex flex-wrap items-center gap-3">
                <span>
                  <CharacterName name={view.loser.name} characterClass={view.loser.characterClass} /> te doit{" "}
                  {formatGold(view.game.stake)}.
                </span>
                <ConfirmButton
                  action={confirmDeathrollPayment}
                  fields={{ deathrollId: view.game.id }}
                  label="Paiement reçu"
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <section className="mt-8" aria-label="Dernières parties">
        <h2 className="font-pixel text-xl text-ivory">Dernières parties</h2>
        {games.length === 0 && (
          <p className="mt-3 text-muted">
            Aucune partie : défiez un membre depuis l&apos;onglet Deathroll de l&apos;addon.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {games.map((view) => (
            <li key={view.game.id} className="panel">
              <p>
                <Duel view={view} />
                <span className="ml-3 text-xs text-muted">{formatDateTime(view.game.endedAt)}</span>
                {view.game.paidAt === undefined && (
                  <span className="ml-3 text-xs font-extrabold text-loss">À payer</span>
                )}
              </p>
              <p className="mt-1 text-sm text-lavender">
                Départ {view.game.start} : {view.game.rolls.map((roll) => roll.result).join(" → ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
