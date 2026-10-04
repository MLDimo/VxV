"use client";

import { LOOT_METHODS } from "@vxv/server/domain/history";
import { LOOT_METHOD_LABELS } from "@vxv/server/domain/labels";
import { useActionState } from "react";
import { correctLoot } from "@/app/actions/history";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";

const FIELD = "mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2";

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
        <span className="text-sm text-zinc-300">Loot à corriger</span>
        <select name="lootId" required className={FIELD}>
          {loots.map((loot) => (
            <option key={loot.id} value={loot.id}>
              {loot.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Reçu par</span>
        <select name="characterId" required className={FIELD}>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Attribué par</span>
        <select name="method" required className={FIELD}>
          {LOOT_METHODS.map((method) => (
            <option key={method} value={method}>
              {LOOT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-zinc-300">Motif de la correction (visible dans le journal)</span>
        <input name="reason" required className={FIELD} placeholder="Erreur de clic du maître du butin" />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Correction…" : "Corriger"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
