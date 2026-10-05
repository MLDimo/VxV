"use client";

import { LOOT_METHODS } from "@vxv/server/domain/history";
import { LOOT_METHOD_LABELS } from "@vxv/server/domain/labels";
import { useActionState } from "react";
import { correctLoot } from "@/app/actions/history";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

const FIELD = "field";

export interface CorrectableLoot {
  id: string;
  label: string;
}

export interface GuildCharacter {
  id: string;
  name: string;
}

/** Officers correct who received a loot and how it was given, with a reason kept in the journal. */
export function LootCorrectionForm({ loots, characters }: { loots: CorrectableLoot[]; characters: GuildCharacter[] }) {
  const [state, action, pending] = useActionState(correctLoot, IDLE);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm text-lavender">Loot à corriger</span>
        <select name="lootId" required className={FIELD}>
          {loots.map((loot) => (
            <option key={loot.id} value={loot.id}>
              {loot.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Reçu par</span>
        <select name="characterId" required className={FIELD}>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Attribué par</span>
        <select name="method" required className={FIELD}>
          {LOOT_METHODS.map((method) => (
            <option key={method} value={method}>
              {LOOT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-lavender">Motif de la correction (visible dans le journal)</span>
        <input name="reason" required className={FIELD} placeholder="Erreur de clic du maître du butin" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="button-pixel">
          {pending ? "Correction…" : "Corriger"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
