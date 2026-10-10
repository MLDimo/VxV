"use client";

import { softReserveCount } from "@vxv/server/domain/labels";
import type { BoardItem } from "@vxv/server";
import { canEquip } from "@vxv/server/domain/equipment";
import { SOFT_RESERVE_BONUS_CAP, SOFT_RESERVE_BONUS_STEP } from "@vxv/server/domain/softReserves";
import { useActionState, useState } from "react";
import { setMySoftReserves } from "@/app/actions/softReserves";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { CharacterName } from "./CharacterName";
import { groupByBoss } from "./softReserveGroups";

/**
 * The event's loot with everyone's reserves; signed-up members tick their own within the allowance, among the items
 * their character's class may equip, or tick again in one click those of their last raid on the same raids.
 */
export function SoftReserveBoardForm({
  eventId,
  items,
  allowance,
  characterClass,
  reusable,
  locked,
  lockLabel,
}: {
  eventId: string;
  items: BoardItem[];
  allowance: number;
  /** The class of the member's signed-up character; undefined without sign-up. */
  characterClass: string | undefined;
  /** The reserves of the member's last raid on the same raids that are still allowed. */
  reusable: number[];
  locked: boolean;
  /** When the soft reserves lock, already formatted in the guild's time zone. */
  lockLabel: string;
}) {
  const signedUp = characterClass !== undefined;
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
      <p className={`text-sm ${locked ? "text-gold" : "text-muted"}`}>
        {locked
          ? `SR verrouillées depuis le ${lockLabel} : seul un officier peut encore les modifier.`
          : `Verrouillage des SR le ${lockLabel}.`}
      </p>
      {!locked && (
        <p className="text-sm text-muted">
          {signedUp
            ? `Vous avez droit à ${softReserveCount(allowance)} : ${chosen.size} choisie(s).`
            : "Inscrivez-vous à l'événement pour choisir vos SR."}
        </p>
      )}
      {canReserve && reusable.length > 0 && (
        <button type="button" onClick={() => setChosen(new Set(reusable))} className="button-wood mt-2">
          Réutiliser mes SR précédentes
        </button>
      )}
      <p className="text-xs text-muted">
        SR+ : +{SOFT_RESERVE_BONUS_STEP} au roll pour chaque raid précédent où le joueur était présent et avait réservé
        l&apos;objet sans l&apos;obtenir, jusqu&apos;à +{SOFT_RESERVE_BONUS_CAP}.
      </p>
      {groupByBoss(items).map((group) => (
        <fieldset key={`${group.raidName}/${group.bossName}`} className="mt-4">
          <legend className="font-pixel text-sm text-ivory">
            {group.raidName} · {group.bossName}
          </legend>
          <ul className="mt-4 divide-y divide-line bg-panel ring-pixel">
            {group.items.map((item) => {
              const unfit = !canEquip(characterClass, item.kind);
              return (
                <li key={item.itemId} className="px-4 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-3">
                      {unfit ? (
                        <span className="w-[13px]" aria-hidden />
                      ) : (
                        <input
                          type="checkbox"
                          name="itemIds"
                          value={item.itemId}
                          checked={chosen.has(item.itemId)}
                          disabled={!canReserve || item.excluded || (full && !chosen.has(item.itemId))}
                          onChange={(event) => toggle(item.itemId, event.target.checked)}
                        />
                      )}
                      <span className={item.excluded || unfit ? "text-muted line-through" : "text-epic"}>
                        {item.name}
                      </span>
                    </label>
                    {item.excluded && <span className="text-xs text-gold">exclu par les officiers</span>}
                    {unfit && <span className="text-xs text-muted">ne s&apos;équipe pas avec ta classe</span>}
                    <span className="ml-auto text-xs text-muted">
                      {softReserveCount(item.reservedBy.length)} · {item.alreadyOwnedBy} l&apos;ont déjà
                    </span>
                  </div>
                  {item.reservedBy.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-x-3 pl-7 text-sm">
                      {item.reservedBy.map((reserver) => (
                        <span key={reserver.characterName}>
                          <CharacterName name={reserver.characterName} characterClass={reserver.characterClass} />
                          {reserver.bonus > 0 && (
                            <span
                              className="ml-1 bg-gold px-1 text-xs font-extrabold text-ink"
                              title="Bonus SR+ ajouté au roll"
                            >
                              SR+ +{reserver.bonus}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      {canReserve && (
        <button type="submit" disabled={pending} className="button-pixel mt-4">
          Enregistrer mes SR
        </button>
      )}
      <ActionMessages state={state} />
    </form>
  );
}
