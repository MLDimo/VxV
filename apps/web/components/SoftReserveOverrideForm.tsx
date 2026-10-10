"use client";

import type { BoardItem } from "@vxv/server";
import { canEquip } from "@vxv/server/domain/equipment";
import { useActionState, useId, useState } from "react";
import { overrideSoftReserves } from "@/app/actions/softReserves";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Options, ReasonField } from "./Field";

interface SignedUpCharacter {
  characterId: string;
  characterName: string;
  characterClass: string;
}

/**
 * Officers set a signed-up player's soft reserves, even after the lock, with a reason, among the items the player's
 * class may equip.
 */
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
  const characterClass = players.find((player) => player.characterId === characterId)?.characterClass;
  const playerFieldId = useId();
  if (players.length === 0) {
    return <p className="mt-2 text-sm text-muted">Personne n&apos;est encore inscrit.</p>;
  }
  return (
    <form action={action} className="mt-4 max-w-2xl space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor={playerFieldId} className="text-sm text-lavender">
          Joueur
        </label>
        <select
          id={playerFieldId}
          name="characterId"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          className="field"
        >
          <Options options={players.map((player) => [player.characterId, player.characterName] as const)} />
        </select>
      </div>
      {/* Remounted per player, so that the boxes start from that player's current reserves. */}
      <fieldset key={characterId}>
        <legend className="text-sm text-lavender">Ses SR</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {items
            .filter((item) => canEquip(characterClass, item.kind))
            .map((item) => (
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
      <ReasonField label="Motif de la correction" />
      <button type="submit" disabled={pending} className="button-wood text-gold">
        Corriger ses SR
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
