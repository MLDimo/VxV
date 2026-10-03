"use client";

import type { BoardItem } from "@vxv/server";
import { SOFT_RESERVE_BONUS_CAP, SOFT_RESERVE_BONUS_STEP } from "@vxv/server/domain/softReserves";
import { useActionState, useState } from "react";
import { setMySoftReserves } from "@/app/actions/softReserves";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { CharacterName } from "./CharacterName";
import { softReserveCount } from "./format";
import { groupByBoss } from "./softReserveGroups";

/** The event's loot with everyone's reserves; signed-up members tick their own within the allowance. */
export function SoftReserveBoardForm({
  eventId,
  items,
  allowance,
  signedUp,
  locked,
  lockLabel,
}: {
  eventId: string;
  items: BoardItem[];
  allowance: number;
  signedUp: boolean;
  locked: boolean;
  /** When the soft reserves lock, already formatted in the guild's time zone. */
  lockLabel: string;
}) {
  const canReserve = signedUp && !locked;
  const [state, action, pending] = useActionState(setMySoftReserves, IDLE);
  const [chosen, setChosen] = useState(() => new Set(items.filter((item) => item.mine).map((item) => item.itemId)));
  const full = chosen.size >= allowance;

  const toggle = (itemId: number, checked: boolean) => {
    const next = new Set(chosen);
    if (checked) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    setChosen(next);
  };

  return (
    <form action={action} aria-label="Mes SR" className="mt-4">
      <input type="hidden" name="eventId" value={eventId} />
      <p className={`text-sm ${locked ? "text-amber-300" : "text-zinc-400"}`}>
        {locked
          ? `SR verrouillées depuis le ${lockLabel} : seul un officier peut encore les modifier.`
          : `Verrouillage des SR le ${lockLabel}.`}
      </p>
      {!locked && (
        <p className="text-sm text-zinc-400">
          {signedUp
            ? `Vous avez droit à ${softReserveCount(allowance)} : ${chosen.size} choisie(s).`
            : "Inscrivez-vous à l'événement pour choisir vos SR."}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        SR+ : +{SOFT_RESERVE_BONUS_STEP} au roll pour chaque raid précédent où le joueur était présent et avait réservé
        l&apos;objet sans l&apos;obtenir, jusqu&apos;à +{SOFT_RESERVE_BONUS_CAP}.
      </p>
      {groupByBoss(items).map((group) => (
        <fieldset key={`${group.raidName}/${group.bossName}`} className="mt-4">
          <legend className="text-sm font-semibold text-zinc-300">
            {group.raidName} · {group.bossName}
          </legend>
          <ul className="mt-2 divide-y divide-zinc-800 rounded border border-zinc-800">
            {group.items.map((item) => (
              <li key={item.itemId} className="px-4 py-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="itemIds"
                      value={item.itemId}
                      checked={chosen.has(item.itemId)}
                      disabled={!canReserve || item.excluded || (full && !chosen.has(item.itemId))}
                      onChange={(event) => toggle(item.itemId, event.target.checked)}
                    />
                    <span className={item.excluded ? "text-zinc-500 line-through" : ""}>{item.name}</span>
                  </label>
                  {item.excluded && <span className="text-xs text-amber-400">exclu par les officiers</span>}
                  <span className="ml-auto text-xs text-zinc-400">
                    {softReserveCount(item.reservedBy.length)} · {item.alreadyOwnedBy} l&apos;ont déjà
                  </span>
                </div>
                {item.reservedBy.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-3 pl-7 text-sm">
                    {item.reservedBy.map((reserver) => (
                      <span key={reserver.characterName}>
                        <CharacterName name={reserver.characterName} characterClass={reserver.characterClass} />
                        {reserver.bonus > 0 && (
                          <span className="ml-1 text-xs text-emerald-400" title="Bonus SR+ ajouté au roll">
                            SR+ +{reserver.bonus}
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      {canReserve && (
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Enregistrer mes SR
        </button>
      )}
      <ActionMessages state={state} />
    </form>
  );
}
