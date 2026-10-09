"use client";

import { MAX_CUSTOM_TITLE_LENGTH } from "@vxv/server/domain/customTitles";
import { useActionState } from "react";
import { giveCustomTitle } from "@/app/actions/ranking";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

/** Officers make a title by hand and give it to a member, until the reset or for an undetermined time. */
export function CustomTitleForm({ members }: { members: readonly { memberId: string; name: string }[] }) {
  const [state, action, pending] = useActionState(giveCustomTitle, IDLE);
  return (
    <form action={action} aria-label="Créer un titre" className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Nom du titre">
        <input
          name="name"
          required
          maxLength={MAX_CUSTOM_TITLE_LENGTH}
          className="field"
          placeholder="Sauveur du raid"
        />
      </Field>
      <Field label="Membre">
        <select name="memberId" required className="field">
          <Options options={members.map((member) => [member.memberId, member.name] as const)} />
        </select>
      </Field>
      <Field label="Durée">
        <select name="duration" required className="field">
          <Options
            options={[
              ["reset", "Jusqu'au reset du mercredi"],
              ["indefinite", "Durée indéterminée (jusqu'à ce qu'un officier le retire)"],
            ]}
          />
        </select>
      </Field>
      <ReasonField label="Pourquoi, affiché avec le titre" placeholder="A tenu Onyxia seul" />
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="button-wood text-gold">
          Créer le titre
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
