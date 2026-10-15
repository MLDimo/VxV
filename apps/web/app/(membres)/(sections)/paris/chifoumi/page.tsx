import type { ChifoumiView } from "@vxv/server";
import type { ChifoumiMove } from "@vxv/server/domain/chifoumis";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import Image from "next/image";
import { confirmChifoumiPayment } from "@/app/actions/chifoumis";
import { CharacterName } from "@/components/CharacterName";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DiceNav } from "@/components/DiceNav";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const MOVES: Record<ChifoumiMove, string> = { pierre: "Pierre", feuille: "Feuille", ciseaux: "Ciseaux" };

/** A move: its picture (the mockup's pixel art) and its name. */
function Move({ move }: { move: ChifoumiMove }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Image src={`/images/chifoumi/${move}.png`} alt="" width={20} height={20} className="image-pixelated size-5" />
      {MOVES[move]}
    </span>
  );
}

/** « Thom Leboss bat Vorn Cendrelune · 500 po ». */
function Game({ view }: { view: ChifoumiView }) {
  return (
    <>
      <CharacterName name={view.winner.name} characterClass={view.winner.characterClass} /> bat{" "}
      <CharacterName name={view.loser.name} characterClass={view.loser.characterClass} /> ·{" "}
      <span className="font-pixel text-gold">{formatGold(view.game.stake)}</span>
    </>
  );
}

/** Le Dé Pipé · Chi Fou Mi (owner's request of 14 October): the member's unpaid games, then the latest games. */
export default async function ChifoumiPage() {
  const member = await requireMember();
  const { chifoumis } = getApplication();
  const { owed, toConfirm } = await chifoumis.debtsOf(member);
  const games = await chifoumis.list();
  return (
    <>
      <ScreenHeader kicker="La salle de jeu" kickerClassName="text-neon" title="Chi Fou Mi" />
      <DiceNav current="/paris/chifoumi" />
      <p className="mt-6 max-w-3xl text-lavender">
        Pierre, feuille, ciseaux, un contre un depuis l&apos;addon, au meilleur des trois manches. Les joueurs
        choisissent la mise, 0 compris : le perdant la doit au gagnant jusqu&apos;à ce qu&apos;il confirme le paiement.
        Une dette bloque les paris, les deathrolls et les Chi Fou Mi.
      </p>
      {(owed.length > 0 || toConfirm.length > 0) && (
        <Panel title="Mes dettes" label="Mes dettes de Chi Fou Mi" className="mt-6">
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
                  action={confirmChifoumiPayment}
                  fields={{ chifoumiId: view.game.id }}
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
            Aucune partie : défiez un membre depuis l&apos;onglet Chi Fou Mi de l&apos;addon.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {games.map((view) => (
            <li key={view.game.id} className="panel">
              <p>
                <Game view={view} />
                <span className="ml-3 text-xs text-muted">{formatDateTime(view.game.endedAt)}</span>
                {view.game.paidAt === undefined && view.game.stake > 0 && (
                  <span className="ml-3 text-xs font-extrabold text-loss">À payer</span>
                )}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-lavender">
                {view.game.rounds.map((round, index) => (
                  <span key={index} className="inline-flex items-center gap-1">
                    {index > 0 && " · "}
                    <Move move={round.challenger} /> contre <Move move={round.challenged} />
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
