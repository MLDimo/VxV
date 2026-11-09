import type { GamePlayer } from "@vxv/server";
import { formatDateTime, formatGold } from "@vxv/server/domain/labels";
import type { ActionState } from "./actionState";
import { CharacterName } from "./CharacterName";
import { ConfirmButton } from "./ConfirmButton";
import { Panel } from "./Panel";

/** A game of Le Dé Pipé with its winner and loser. */
interface GameView {
  game: { id: string; stake: number; endedAt: Date; paidAt: Date | undefined };
  winner: GamePlayer;
  loser: GamePlayer;
}

/** What a member owes another once their games are set against each other, and a game of theirs. */
interface PairView {
  id: string;
  debtor: GamePlayer;
  creditor: GamePlayer;
  amount: number;
}

function Player({ player }: { player: GamePlayer }) {
  return <CharacterName name={player.name} characterClass={player.characterClass} />;
}

/**
 * The member's debts in one of Le Dé Pipé's games (P15.6): what they owe each player and what each owes them, their
 * games set against each other, the payments they confirm, then the history of their games with a stake, paid or not
 * (owner's requests of 9 November).
 */
export function GameDebts({
  game,
  memberId,
  debts,
  confirm,
  field,
}: {
  /** The game's name in the panels' labels: « deathroll », « Chi Fou Mi ». */
  game: string;
  memberId: string;
  debts: { owed: readonly PairView[]; toConfirm: readonly PairView[]; history: readonly GameView[] };
  /** The confirmation of a payment by the one owed, and the field that carries a game's id. */
  confirm: (previous: ActionState, form: FormData) => Promise<ActionState>;
  field: string;
}) {
  const { owed, toConfirm, history } = debts;
  return (
    <>
      {(owed.length > 0 || toConfirm.length > 0) && (
        <Panel title="Mes dettes" label={`Mes dettes de ${game}`} className="mt-6">
          <ul className="mt-3 space-y-2">
            {owed.map((pair) => (
              <li key={pair.id} className="text-loss">
                Tu dois {formatGold(pair.amount)} à <Player player={pair.creditor} />.
              </li>
            ))}
            {toConfirm.map((pair) => (
              <li key={pair.id} className="flex flex-wrap items-center gap-3">
                <span>
                  <Player player={pair.debtor} /> te doit {formatGold(pair.amount)}.
                </span>
                <ConfirmButton action={confirm} fields={{ [field]: pair.id }} label="Paiement reçu" />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {history.length > 0 && (
        <Panel title="Historique de mes dettes" label={`Historique des dettes de ${game}`} className="mt-6">
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((view) => (
              <li key={view.game.id} className="flex flex-wrap items-baseline gap-x-3">
                <span>
                  {view.loser.memberId === memberId ? (
                    <>
                      Tu devais {formatGold(view.game.stake)} à <Player player={view.winner} />
                    </>
                  ) : (
                    <>
                      <Player player={view.loser} /> te devait {formatGold(view.game.stake)}
                    </>
                  )}
                </span>
                <span className="text-xs text-muted">partie du {formatDateTime(view.game.endedAt)}</span>
                {view.game.paidAt === undefined ? (
                  <span className="text-xs font-extrabold text-loss">À payer</span>
                ) : (
                  <span className="text-xs font-extrabold text-gain">Payée le {formatDateTime(view.game.paidAt)}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
