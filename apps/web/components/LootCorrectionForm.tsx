"use client";

import { LOOT_METHODS } from "@vxv/server/domain/history";
import { LOOT_METHOD_LABELS } from "@vxv/server/domain/labels";
import { useActionState } from "react";
import { correctLoot } from "@/app/actions/history";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

interface CorrectableLoot {
  id: string;
  label: string;
}

interface GuildCharacter {
  id: string;
  name: string;
}

/** Officers correct who received a loot and how it was given, with a reason kept in the journal. */
export function LootCorrectionForm({ loots, characters }: { loots: CorrectableLoot[]; characters: GuildCharacter[] }) {
  const [state, action, pending] = useActionState(correctLoot, IDLE);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Loot à corriger" className="sm:col-span-2">
        <select name="lootId" required className="field">
          <Options options={loots.map((loot) => [loot.id, loot.label] as const)} />
        </select>
      </Field>
      <Field label="Reçu par">
        <select name="characterId" required className="field">
          <Options options={characters.map((character) => [character.id, character.name] as const)} />
        </select>
      </Field>
      <Field label="Attribué par">
        <select name="method" required className="field">
          <Options options={LOOT_METHODS.map((method) => [method, LOOT_METHOD_LABELS[method]] as const)} />
        </select>
      </Field>
      <ReasonField
        label="Motif de la correction"
        placeholder="Erreur de clic du maître du butin"
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="button-pixel">
          {pending ? "Correction…" : "Corriger"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
