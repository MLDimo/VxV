"use client";

import type { BoardItem } from "@vxv/server";
import { useActionState, useId, useState } from "react";
import { overrideSoftReserves } from "@/app/actions/softReserves";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

const FIELD = "mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2";

export interface SignedUpCharacter {
  characterId: string;
  characterName: string;
}

/** Officers set a signed-up player's soft reserves, even after the lock, with a reason. */
export function SoftReserveOverrideForm({
  eventId,
  items,
  players,
}: {
  eventId: string;
  items: BoardItem[];
  players: SignedUpCharacter[];
}) {
  const [state, action, pending] = useActionState(overrideSoftReserves, IDLE);
  const [characterId, setCharacterId] = useState(players[0]?.characterId ?? "");
  const playerFieldId = useId();
  if (players.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">Personne n&apos;est encore inscrit.</p>;
  }
  return (
    <form action={action} className="mt-4 max-w-2xl space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor={playerFieldId} className="text-sm text-zinc-300">
          Joueur
        </label>
        <select
          id={playerFieldId}
          name="characterId"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          className={FIELD}
        >
          {players.map((player) => (
            <option key={player.characterId} value={player.characterId}>
              {player.characterName}
            </option>
          ))}
        </select>
      </div>
      {/* Remounted per player, so that the boxes start from that player's current reserves. */}
      <fieldset key={characterId}>
        <legend className="text-sm text-zinc-300">Ses SR</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {items.map((item) => (
            <label key={item.itemId} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="itemIds"
                value={item.itemId}
                defaultChecked={item.reservedBy.some((reserver) => reserver.characterId === characterId)}
              />
              {item.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm text-zinc-300">Motif de la correction (visible dans le journal)</span>
        <input name="reason" required className={FIELD} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        Corriger ses SR
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
